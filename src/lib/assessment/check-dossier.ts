import { countWords } from "@/lib/domain/assessment";
import type { CefrLevel, Language } from "@/lib/schemas/common";
import { ASSESSMENT_LIMITS, assessmentDossierSchema, type AssessmentDossier } from "@/lib/schemas/assessment";
import { audioPublicPath } from "./audio";

/**
 * Problems of a dossier against the mechanical authoring rules (AUTHORING.md); empty when it is
 * valid. Shared by the unit test and `npm run assessment:check`.
 */
export function checkAssessmentDossier(language: Language, level: CefrLevel, raw: unknown): string[] {
  const parsed = assessmentDossierSchema.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  }
  const dossier = parsed.data;
  const problems: string[] = [];
  if (dossier.language !== language) problems.push(`language is ${dossier.language}, expected ${language}`);
  if (dossier.level !== level) problems.push(`level is ${dossier.level}, expected ${level}`);

  const idPattern = new RegExp(`^${language}-${level.toLowerCase()}-[1-9]\\d*$`);
  if (!idPattern.test(dossier.id)) problems.push(`id ${dossier.id} must be ${language}-${level.toLowerCase()}-<n>`);

  dossier.reading.questions.forEach((q, i) => {
    if (q.id !== `${dossier.id}-r${i + 1}`) problems.push(`reading question ${i + 1}: id ${q.id}, expected ${dossier.id}-r${i + 1}`);
  });
  dossier.listening.questions.forEach((q, i) => {
    if (q.id !== `${dossier.id}-l${i + 1}`) problems.push(`listening question ${i + 1}: id ${q.id}, expected ${dossier.id}-l${i + 1}`);
  });

  const limits = ASSESSMENT_LIMITS[level];
  const textWords = countWords(dossier.reading.text, language);
  if (textWords < limits.text.min || textWords > limits.text.max) {
    problems.push(`reading.text has ${textWords} words, expected ${limits.text.min}-${limits.text.max}`);
  }
  if (dossier.listening.source === "script") {
    const scriptWords = countWords(dossier.listening.script, language);
    if (scriptWords < limits.script.min || scriptWords > limits.script.max) {
      problems.push(`listening.script has ${scriptWords} words, expected ${limits.script.min}-${limits.script.max}`);
    }

    const shared = commonSentences(dossier.reading.text, dossier.listening.script);
    if (shared.length > 0) problems.push(`listening.script repeats the reading text (« ${shared[0]} »): it must be the sequel`);
  } else {
    const { start, end } = dossier.listening.video;
    const seconds = end - start;
    if (seconds < limits.video.min || seconds > limits.video.max) {
      problems.push(`listening.video lasts ${seconds} s, expected ${limits.video.min}-${limits.video.max}`);
    }
    // A recording without a script makes no sense.
    if (dossier.audio !== null) problems.push("audio must be null for a YouTube listening (there is no script to record)");
  }

  const expectedAudio = audioPublicPath(language, dossier.id);
  if (dossier.audio && dossier.audio.file !== expectedAudio) {
    problems.push(`audio.file is ${dossier.audio.file}, expected ${expectedAudio}`);
  }

  problems.push(...whitespaceProblems(dossier));
  return problems;
}

function sentences(text: string): string[] {
  return text
    .split(/[.!?…。！？]+/u)
    .map((s) => s.replace(/\s+/g, " ").trim().toLowerCase())
    .filter((s) => s.length > 0);
}

function commonSentences(a: string, b: string): string[] {
  const inA = new Set(sentences(a));
  return sentences(b).filter((s) => inA.has(s));
}

/** Texts shown or read aloud must not start or end with whitespace. */
function whitespaceProblems(dossier: AssessmentDossier): string[] {
  const fields: [string, string][] = [
    ["title", dossier.title],
    ["reading.text", dossier.reading.text],
    ...(dossier.listening.source === "script"
      ? [["listening.script", dossier.listening.script] as [string, string]]
      : [
          ["listening.video.title", dossier.listening.video.title] as [string, string],
          ["listening.video.channel", dossier.listening.video.channel] as [string, string],
        ]),
    ["writing.prompt", dossier.writing.prompt],
  ];
  return fields.filter(([, value]) => value !== value.trim()).map(([name]) => `${name}: leading or trailing whitespace`);
}
