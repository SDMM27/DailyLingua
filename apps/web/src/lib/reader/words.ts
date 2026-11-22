import { isTargetLanguage, normalizeAnswer } from "@dailylingua/core";
import { languageCodeSchema } from "@dailylingua/schemas";
import { z } from "zod";

const wordSchema = z.object({
  lemma: z.string().trim().min(1).max(100),
  dictionaryForm: z.string().trim().min(1).max(100),
  definition: z.string().trim().min(1).max(400),
  sentence: z.int().min(0).max(99),
  forms: z.array(z.string().trim().min(1).max(100)).max(8).optional(),
  glosses: z.record(languageCodeSchema, z.string().trim().min(1).max(400)).optional(),
});

export interface ReaderWord {
  from: number;
  to: number;
  front: string;
  meaning: string;
  meaningLanguage: string;
  context: string;
}

/** Annotates only vocabulary entries that can be located in their source sentence. */
export function readerWords(body: string, entries: unknown, language: string, explanationLanguage: string): ReaderWord[] {
  if (!isTargetLanguage(language) || !Array.isArray(entries) || entries.length === 0) return [];
  const segmenter = new Intl.Segmenter(language, { granularity: "word" });
  const sentenceSegmenter = new Intl.Segmenter(language, { granularity: "sentence" });
  const sentences = Array.from(sentenceSegmenter.segment(body)).filter(({ segment }) => segment.trim());
  const normalize = (value: string) => normalizeAnswer(language, value).replaceAll("ς", "σ");
  const words = new Map<number, ReaderWord>();
  for (const entry of entries.slice(0, 8)) {
    const parsed = wordSchema.safeParse(entry);
    if (!parsed.success) continue;
    const { lemma, dictionaryForm, sentence, definition, glosses, forms = [] } = parsed.data;
    const source = sentences[sentence];
    if (!source) continue;
    const accepted = new Set([lemma, dictionaryForm, ...forms].map(normalize).filter(Boolean));
    const translated = Object.hasOwn(glosses ?? {}, explanationLanguage) ? glosses?.[explanationLanguage] : undefined;
    for (const { segment, index, isWordLike } of segmenter.segment(source.segment)) {
      const from = source.index + index;
      if (!isWordLike || !accepted.has(normalize(segment)) || words.has(from)) continue;
      words.set(from, {
        from, to: from + segment.length, front: dictionaryForm, meaning: translated ?? definition,
        meaningLanguage: translated ? explanationLanguage : language, context: source.segment.trim(),
      });
    }
  }
  return [...words.values()].sort((left, right) => left.from - right.from);
}
