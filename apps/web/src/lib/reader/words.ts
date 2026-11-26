import { isTargetLanguage, normalizeAnswer } from "@dailylingua/core";
import { languageCodeSchema } from "@dailylingua/schemas";
import { z } from "zod";
import { readerComparison } from "./comparisons";

const wordSchema = z.object({
  lemma: z.string().trim().min(1).max(100),
  dictionaryForm: z.string().trim().min(1).max(100),
  definition: z.string().trim().min(1).max(400),
  sentence: z.int().min(0).max(99),
  forms: z.array(z.string().trim().min(1).max(100)).max(8).optional(),
  glosses: z.record(languageCodeSchema, z.string().trim().min(1).max(400)).optional(),
  comparisonId: z.string().max(80).optional(),
});

export interface ReaderWord {
  from: number;
  to: number;
  front: string;
  meaning: string;
  meaningLanguage: string;
  context: string;
  comparison?: ReturnType<typeof readerComparison>;
}

type LemmaIdentity = { lemma: string; definition: string };

/** Annotates only vocabulary entries that can be located in their source sentence. */
function annotateWords(body: string, entries: unknown, language: string, explanationLanguage: string,
  knownLanguages: readonly string[]) {
  const matches = new Map<number, { word: ReaderWord; identity: LemmaIdentity | null }>();
  if (!isTargetLanguage(language) || !Array.isArray(entries) || entries.length === 0) return matches;
  const segmenter = new Intl.Segmenter(language, { granularity: "word" });
  const sentenceSegmenter = new Intl.Segmenter(language, { granularity: "sentence" });
  const sentences = Array.from(sentenceSegmenter.segment(body)).filter(({ segment }) => segment.trim());
  const normalize = (value: string) => normalizeAnswer(language, value).replaceAll("ς", "σ");
  for (const entry of entries.slice(0, 8)) {
    const parsed = wordSchema.safeParse(entry);
    if (!parsed.success) continue;
    const { lemma, dictionaryForm, sentence, definition, glosses, forms = [], comparisonId } = parsed.data;
    const source = sentences[sentence];
    if (!source) continue;
    const accepted = new Set([lemma, dictionaryForm, ...forms].map(normalize).filter(Boolean));
    const translated = Object.hasOwn(glosses ?? {}, explanationLanguage) ? glosses?.[explanationLanguage] : undefined;
    const comparison = readerComparison(comparisonId, language, lemma, explanationLanguage, knownLanguages);
    for (const { segment, index, isWordLike } of segmenter.segment(source.segment)) {
      const from = source.index + index;
      if (!isWordLike || !accepted.has(normalize(segment))) continue;
      const identity = { lemma: lemma.toLocaleLowerCase(language).normalize("NFC").replaceAll("\u0301", "").normalize("NFC"),
        definition: definition.normalize("NFC").replace(/\s+/g, " ") };
      const previous = matches.get(from);
      if (previous) {
        if (previous.identity?.lemma !== identity.lemma || previous.identity.definition !== identity.definition) previous.identity = null;
        continue;
      }
      const word = {
        from, to: from + segment.length, front: dictionaryForm, meaning: translated ?? definition,
        meaningLanguage: translated ? explanationLanguage : language, context: source.segment.trim(),
        ...(comparison ? { comparison } : {}),
      };
      matches.set(from, { word, identity });
    }
  }
  return matches;
}

export function readerWords(body: string, entries: unknown, language: string, explanationLanguage: string,
  knownLanguages: readonly string[] = []): ReaderWord[] {
  return [...annotateWords(body, entries, language, explanationLanguage, knownLanguages).values()]
    .map(({ word }) => word).sort((left, right) => left.from - right.from);
}

/** Resolves a saved card only when its source span is still identifiable and has a single meaning. */
export function readerCardLemma(body: string, entries: unknown, language: string,
  card: { from: number; front: string; context: string | null }): LemmaIdentity | null {
  const match = annotateWords(body, entries, language, language, []).get(card.from);
  return match?.word.front === card.front && match.word.context === card.context ? match.identity : null;
}
