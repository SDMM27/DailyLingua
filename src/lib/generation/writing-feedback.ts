import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  WRITING_CRITERIA,
  WRITING_FEEDBACK_LIMITS,
  wireWritingFeedbackSchema,
  writingFeedbackSchema,
  type WireWritingFeedback,
  type WritingCorrection,
  type WritingFeedback,
} from "@/lib/schemas/writing-feedback";
import { toGenerationError } from "./claude-generator";
import { DEFAULT_MISSION_MODEL } from "./config";
import { GenerationError } from "./errors";
import { escapeData } from "./prompt";
import {
  WRITING_FEEDBACK_PROMPT_VERSION,
  WRITING_FEEDBACK_SYSTEM_PROMPT,
  buildWritingFeedbackMessage,
  type WritingFeedbackRequest,
} from "./writing-feedback-prompt";

/** The part of the SDK client used here, so tests can inject a fake. */
export interface FeedbackParseClient {
  messages: {
    parse(params: {
      model: string;
      max_tokens: number;
      system: string;
      messages: { role: "user"; content: string }[];
      output_config: { format: ReturnType<typeof zodOutputFormat<typeof wireWritingFeedbackSchema>>; effort: "low" | "medium" };
    }): Promise<{
      parsed_output: WireWritingFeedback | null;
      stop_reason: string | null;
      usage: { input_tokens: number; output_tokens: number };
    }>;
  };
}

export interface WritingReview {
  feedback: WritingFeedback;
  model: string;
  promptVersion: string;
  usage: { inputTokens: number; outputTokens: number };
}

/** Reviews one text. Throws `GenerationError` on any failure (the caller just shows no feedback). */
export interface WritingReviewer {
  review(request: WritingFeedbackRequest): Promise<WritingReview>;
}

export interface ClaudeWritingReviewerOptions {
  apiKey?: string;
  model?: string;
  client?: FeedbackParseClient;
  /** Default "medium": at "low", telegraphic texts were scored too high (see `npm run feedback:eval`). */
  effort?: "low" | "medium";
  /** Per attempt; the SDK retries once. Default 30 s: the learner is waiting on the screen (the native version makes the output longer). */
  timeoutMs?: number;
}

/** Same comparison as the model is asked for ("copied exactly"), tolerant to spacing only. */
function normalise(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

/**
 * Maps the model's answer to the stored shape and enforces the contract: scores, lengths and the
 * number of corrections are checked by `writingFeedbackSchema`, and any violation rejects the whole
 * answer. One content check is lenient: a correction whose `original` is not in the learner's text
 * (the model paraphrased it) or that changes nothing is dropped, since it cannot be shown in place.
 */
export function validateWritingFeedback(wire: WireWritingFeedback, text: string): WritingFeedback {
  // The model saw the escaped text: compare with what it saw.
  const seen = normalise(escapeData(text));
  const corrections = wire.corrections
    .map((c): WritingCorrection => ({
      original: c.original.trim(),
      corrected: c.corrected.trim(),
      explanation: c.explanation_fr.trim(),
      category: c.category,
    }))
    .filter((c) => c.original && seen.includes(normalise(c.original)) && normalise(c.original) !== normalise(c.corrected));

  const parsed = writingFeedbackSchema.safeParse({
    scores: Object.fromEntries(
      WRITING_CRITERIA.map((criterion) => [
        criterion,
        { score: wire[criterion].score, comment: wire[criterion].comment_fr },
      ]),
    ),
    corrections,
    strength: wire.strength_fr,
    nativeVersion: wire.native_version.trim(),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new GenerationError("invalid_output", `retour invalide (${issue?.path.join(".")}: ${issue?.message})`);
  }
  return parsed.data;
}

/** Reviews written productions with Claude, through structured outputs validated against the wire schema. */
export function createClaudeWritingReviewer(options: ClaudeWritingReviewerOptions = {}): WritingReviewer {
  const model = options.model ?? DEFAULT_MISSION_MODEL;
  let client: FeedbackParseClient | undefined = options.client;

  function getClient(): FeedbackParseClient {
    client ??= new Anthropic({
      apiKey: options.apiKey,
      timeout: options.timeoutMs ?? 30_000,
      maxRetries: 1,
    }) as unknown as FeedbackParseClient;
    return client;
  }

  return {
    async review(request) {
      if (request.text.length > WRITING_FEEDBACK_LIMITS.maxChars) {
        throw new GenerationError("too_long", "texte trop long pour une correction");
      }
      let response;
      try {
        response = await getClient().messages.parse({
          model,
          max_tokens: 8000,
          system: WRITING_FEEDBACK_SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildWritingFeedbackMessage(request) }],
          output_config: { format: zodOutputFormat(wireWritingFeedbackSchema), effort: options.effort ?? "medium" },
        });
      } catch (error) {
        throw toGenerationError(error);
      }
      if (response.stop_reason === "refusal") throw new GenerationError("refusal", "Claude a refusé de répondre");
      if (response.stop_reason === "max_tokens") {
        throw new GenerationError("max_tokens", "Claude : réponse tronquée (max_tokens)");
      }
      if (!response.parsed_output) throw new GenerationError("invalid_output", "Claude : réponse illisible");
      return {
        feedback: validateWritingFeedback(response.parsed_output, request.text),
        model,
        promptVersion: WRITING_FEEDBACK_PROMPT_VERSION,
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
      };
    },
  };
}
