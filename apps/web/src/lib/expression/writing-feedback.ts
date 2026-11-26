import {
  AiError, WRITING_FEEDBACK_PROMPT_VERSION, WRITING_FEEDBACK_SYSTEM_PROMPT, buildWritingFeedbackMessage,
  type AiGateway,
} from "@dailylingua/ai";
import { isTargetLanguage, languageDisplayName } from "@dailylingua/core";
import type { CorrectionRow, WritingFeedbackStore } from "@dailylingua/data";
import {
  cefrLevelSchema, languageCodeSchema, MAX_REWRITE_CHARS, storedWritingFeedbackSchema, WRITING_CRITERIA,
  WRITING_FEEDBACK_LIMITS, writingFeedbackOutputSchema, writingFeedbackSchema,
  type SessionPacket, type StoredWritingFeedback, type WritingFeedback, type WritingFeedbackOutput, type WritingFeedbackResponse,
} from "@dailylingua/schemas";
import { writingLevels } from "@/lib/ingest/build-state";

type Context = NonNullable<Awaited<ReturnType<WritingFeedbackStore["readContext"]>>>;
type FeedbackTarget = { productionId: string; sessionId: string; deferred?: boolean };

export interface FeedbackDeps {
  store: WritingFeedbackStore;
  getAi(): AiGateway | null;
  reconcile(userId: string, target: FeedbackTarget, now: Date): Promise<{ feedbackEligible?: boolean }>;
  recordError?(input: { userId: string; correction: CorrectionRow; context: Context }): Promise<SessionPacket["errorOfTheDay"]>;
}

const normalize = (s: string) => s.normalize("NFC").replace(/\s+/gu, " ").trim();
const purposes = new Set(["general", "conversational", "professional", "travel", "exam"]);

function sentencesOf(text: string, segmenter: Intl.Segmenter): string[] {
  return [...segmenter.segment(text)].map(({ segment }) => segment.trim()).filter(Boolean);
}

/** Group corrections in authentic sentences, ranked by the model's teaching priority. */
function selectSentences(feedback: WritingFeedback, context: Context): StoredWritingFeedback["sentences"] {
  const segmenter = new Intl.Segmenter(context.language, { granularity: "sentence" });
  const originals = sentencesOf(context.text, segmenter);
  const nativeSentences = sentencesOf(feedback.nativeVersion, segmenter);
  const bySentence = new Map<string, StoredWritingFeedback["sentences"][number]>();
  for (const [index, correction] of feedback.corrections.entries()) {
    const passage = normalize(correction.original);
    const sentenceIndex = originals.findIndex((sentence) => normalize(sentence).includes(passage));
    const source = originals[sentenceIndex];
    const sentence = source && source.length <= MAX_REWRITE_CHARS ? source : correction.original;
    const native = originals.length === nativeSentences.length ? nativeSentences[sentenceIndex] : undefined;
    const entry = bySentence.get(sentence) ?? {
      text: sentence,
      nativeText: source === sentence && native && native.length <= MAX_REWRITE_CHARS ? native : null,
      errors: [],
    };
    entry.errors.push({ ...correction, id: String(index) });
    bySentence.set(sentence, entry);
  }
  const all = [...bySentence.values()];
  const substantive = all.filter(({ errors }) => errors.some((error) => error.category !== "spelling"));
  return (substantive.length ? substantive : all).slice(0, context.format === 10 ? 1 : 2);
}

function validateOutput(output: WritingFeedbackOutput, context: Context): StoredWritingFeedback {
  // Validate all fields, then drop paraphrased passages and no-op or repeated corrections.
  const parsed = writingFeedbackSchema.parse({
    scores: Object.fromEntries(WRITING_CRITERIA.map((key) => [key, output[key]])),
    corrections: output.corrections,
    strength: output.strength,
    nativeVersion: output.nativeVersion,
  });
  const seen = new Set<string>();
  const submission = normalize(context.text);
  const feedback = { ...parsed, corrections: parsed.corrections.filter(({ original, corrected }) => {
    const from = normalize(original);
    const to = normalize(corrected);
    if (!submission.includes(from) || from === to || seen.has(from)) return false;
    seen.add(from);
    return true;
  }) };
  const detected = languageCodeSchema.safeParse(output.detectedLanguage.trim().toLowerCase());
  return storedWritingFeedbackSchema.parse({
    feedback,
    detectedLanguage: detected.success && detected.data !== "und" ? detected.data : null,
    sentences: selectSentences(feedback, context),
  });
}

/** A request can only correct text previously accepted into the authenticated learner's journal. */
export async function requestWritingFeedback(
  { userId, productionId, now, isGuest }: { userId: string; productionId: string; now: Date; isGuest?: boolean },
  deps: FeedbackDeps,
): Promise<WritingFeedbackResponse> {
  const context = await deps.store.readContext(userId, productionId);
  if (!context) return { status: "not_found" };
  const target = { productionId, sessionId: context.sessionId };
  const ready = async (correction: CorrectionRow): Promise<WritingFeedbackResponse> => {
    const { feedbackEligible } = await deps.reconcile(userId, target, now);
    const errorOfTheDay = feedbackEligible ? await deps.recordError?.({ userId, correction, context }) : null;
    if (errorOfTheDay) await deps.reconcile(userId, target, now);
    return {
      status: "ready",
      correctionId: correction.id,
      explanationLanguage: correction.explanationLanguage,
      feedback: correction.stored.feedback,
      sentences: feedbackEligible ? correction.stored.sentences : [],
      errorOfTheDay,
    };
  };
  const deferred = async (status: "limit" | "disabled" | "failed" | "invalid_production"): Promise<WritingFeedbackResponse> => {
    await deps.reconcile(userId, { ...target, deferred: true }, now);
    return { status };
  };

  const existing = await deps.store.readCorrection(userId, productionId);
  if (existing) return ready(existing);
  if (!isTargetLanguage(context.language) || !languageCodeSchema.safeParse(context.nativeLanguage).success ||
    !context.task || context.text.length > WRITING_FEEDBACK_LIMITS.maxChars ||
    context.text.replace(/\s/gu, "").length < WRITING_FEEDBACK_LIMITS.minChars) {
    return deferred("invalid_production");
  }
  const ai = isGuest ? null : deps.getAi();
  if (!ai) return deferred("disabled");

  const claim = await deps.store.claim(userId, productionId);
  if (claim === "ready") {
    const correction = await deps.store.readCorrection(userId, productionId);
    return correction ? ready(correction) : deferred("failed");
  }
  if (claim === "failed") return deferred("failed");
  if (claim !== "claimed") return { status: claim };

  const level = writingLevels(context.skillEstimates)[context.language] ?? "B1";
  const targetLevel = cefrLevelSchema.safeParse(context.targetLevel);
  const description = (code: string) => ({ code, name: languageDisplayName(code, code) });
  const message = buildWritingFeedbackMessage({
    studiedLanguage: description(context.language),
    firstLanguage: description(context.nativeLanguage),
    level,
    targetLevel: targetLevel.success ? targetLevel.data : level,
    purpose: context.purpose && purposes.has(context.purpose) ? context.purpose : null,
    task: context.task,
    inputMode: context.mode === "spoken" ? "speech_transcript" : "typed",
    text: context.text,
  });

  let result;
  let stored;
  try {
    result = await ai.call({
      purpose: "writing_feedback",
      promptVersion: WRITING_FEEDBACK_PROMPT_VERSION,
      system: WRITING_FEEDBACK_SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
      schema: writingFeedbackOutputSchema,
      learner: { id: userId, timeZone: context.timeZone },
      retryProvider: false,
    });
    stored = validateOutput(result.output, context);
  } catch (error) {
    if (error instanceof AiError && (error.code === "quota_exceeded" || error.code === "budget_exhausted")) {
      await deps.store.release(userId, productionId);
      return deferred("limit");
    }
    await deps.store.fail(userId, productionId);
    return deferred("failed");
  }

  const saved = {
    userId, productionId, explanationLanguage: context.nativeLanguage, stored,
    model: result.model, promptVersion: result.promptVersion, usage: result.usage,
  };
  // Persist the same result on a lost database response; this path never calls the model again.
  const correction = await deps.store.save(saved).catch(() => deps.store.save(saved));
  return ready(correction);
}
