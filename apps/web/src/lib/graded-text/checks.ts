import { countWords, languageInfo, normalizeAnswer, STRESS_MARK, trigramSimilarity, type Language } from "@dailylingua/core";
import { GRAMMAR_CURRICULUM } from "../../../../../src/lib/grammar/curriculum";
import type { GradedTextDraft } from "./schema";

export const TEXT_PROMPT_VERSION = "j2-2026-11-19.1";
export const TEXT_DENSITY = 2;
export const THEMES = ["daily_life", "home", "food_cooking", "health_wellbeing", "work", "studies", "travel", "transport", "city_neighbourhood", "nature_environment", "animals", "sport", "music", "cinema_series", "books_reading", "technology", "shopping_money", "family_friends", "festivals_traditions", "history_heritage", "science_discoveries", "crafts_trades"] as const;
export type Theme = typeof THEMES[number];

export const LEVELS = {
  A2: { length: 180, band: 2000, minRank: 1000, share: 0.97, newWords: 5, listening: [40, 60], task: "describe or recount a personal experience" },
  B1: { length: 300, band: 3500, minRank: 2000, share: 0.97, newWords: 6, listening: [60, 90], task: "narrate and give an opinion with two reasons" },
  B2: { length: 475, band: 5000, minRank: 2000, share: 0.96, newWords: 7, listening: [80, 120], task: "compare or argue a point" },
  C1: { length: 700, band: 5000, minRank: 2000, share: 0.94, newWords: 8, listening: [100, 150], task: "give a nuanced view or switch register" },
} as const;
export type TextLevel = keyof typeof LEVELS;

export interface TextCell {
  language: Language;
  level: TextLevel;
  theme: Theme;
}

export function grammarFor({ language, level }: TextCell) {
  return (GRAMMAR_CURRICULUM[language] ?? []).filter((point) => level !== "A2" || point.level !== "B1");
}

const formKey = (language: Language, form: string) => normalizeAnswer(language, form).replaceAll("ς", "σ");

export async function frequencyRanks(language: Language): Promise<ReadonlyMap<string, number> | null> {
  if (!GRAMMAR_CURRICULUM[language]) return null;
  const { default: words } = await import(`../../../../../src/lib/frequency/data/${language}.json`) as { default: string[] };
  const ranks = new Map<string, number>();
  for (const word of words) {
    const key = formKey(language, word);
    if (key && !ranks.has(key)) ranks.set(key, ranks.size + 1);
  }
  return ranks;
}

const SCRIPT_CLASSES: Record<string, RegExp> = {
  ar: /\p{Script=Arabic}/u,
  el: /\p{Script=Greek}/u,
  ru: /\p{Script=Cyrillic}/u,
  uk: /\p{Script=Cyrillic}/u,
  zh: /\p{Script=Han}/u,
  ja: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u,
  ko: /\p{Script=Hangul}/u,
};
const LATIN = /\p{Script=Latin}/u;

export function textBody(paragraphs: GradedTextDraft["paragraphs"]): string {
  return paragraphs.map((paragraph) => paragraph.join(" ")).join("\n\n");
}

function hasValidChoices(language: Language, item: {options: string[]}): boolean {
  return new Set(item.options.map((option) => formKey(language, option))).size === 4;
}

export function checkGradedText(cell: TextCell, draft: GradedTextDraft, ranks: ReadonlyMap<string, number>, previous: readonly string[]): string[] {
  const { language, level } = cell;
  const targets = LEVELS[level];
  const issues = new Set<string>();
  const body = textBody(draft.paragraphs);
  const sentences = draft.paragraphs.flat();
  const wordCount = countWords(language, body);
  if (body.length > 8000 || wordCount < targets.length * 0.85 || wordCount > targets.length * 1.15) issues.add("length");

  const sentenceSegmenter = new Intl.Segmenter(language, { granularity: "sentence" });
  const actual = Array.from(sentenceSegmenter.segment(body), (part) => part.segment.trim()).filter(Boolean);
  if (sentences.length > 100 || actual.length !== sentences.length || actual.some((sentence, index) => sentence !== sentences[index])) issues.add("sentence_boundaries");

  const from = draft.listening.from;
  const to = draft.listening.to;
  const listeningWords = countWords(language, sentences.slice(from, to + 1).join(" "));
  if (from > to || to >= sentences.length || (level === "A2" && (from !== 0 || to >= (draft.paragraphs[0]?.length ?? 0))) ||
    listeningWords < targets.listening[0] || listeningWords > targets.listening[1]) issues.add("listening_range");

  const letters = body.match(/\p{L}/gu) ?? [];
  const script = SCRIPT_CLASSES[language] ?? LATIN;
  if (letters.filter((letter) => script.test(letter)).length < letters.length * 0.95 ||
    (languageInfo(language).markStress && body.normalize("NFD").includes(STRESS_MARK))) issues.add("script");

  const wordSegmenter = new Intl.Segmenter(language, { granularity: "word" });
  const occurrences = new Map<string, { count: number; paragraphs: Set<number>; sentences: Set<number> }>();
  const ordinaryWords: string[] = [];
  let sentenceIndex = 0;
  draft.paragraphs.forEach((paragraph, paragraphIndex) => {
    for (const sentence of paragraph) {
      let initial = true;
      for (const part of wordSegmenter.segment(sentence)) {
        if (!part.isWordLike || !/\p{L}/u.test(part.segment)) continue;
        const key = formKey(language, part.segment);
        const entry = occurrences.get(key) ?? { count: 0, paragraphs: new Set<number>(), sentences: new Set<number>() };
        entry.count++;
        entry.paragraphs.add(paragraphIndex);
        entry.sentences.add(sentenceIndex);
        occurrences.set(key, entry);
        const first = Array.from(part.segment)[0] ?? "";
        if (initial || languageInfo(language).capitalizedCommonNouns || first === first.toLocaleLowerCase(language)) ordinaryWords.push(key);
        initial = false;
      }
      sentenceIndex++;
    }
  });

  const lemmas = new Set<string>();
  const newForms = new Set<string>();
  if (draft.words.length !== targets.newWords) issues.add("new_word_count");
  for (const word of draft.words) {
    const lemma = formKey(language, word.lemma);
    const forms = new Set(word.forms.map((form) => formKey(language, form)));
    let count = 0;
    let contextFound = false;
    const paragraphs = new Set<number>();
    for (const key of forms) {
      if (newForms.has(key)) issues.add("new_word_occurrences");
      newForms.add(key);
      const entry = occurrences.get(key);
      if (!entry) {
        issues.add("new_word_occurrences");
        continue;
      }
      contextFound ||= entry.sentences.has(word.sentence);
      count += entry.count;
      for (const paragraph of entry.paragraphs) paragraphs.add(paragraph);
    }
    if (lemmas.has(lemma) || (ranks.get(lemma) ?? Infinity) <= targets.minRank ||
        formKey(language, word.dictionaryForm) !== lemma || !contextFound || count < 3 || paragraphs.size < 2) issues.add("new_word_occurrences");
    lemmas.add(lemma);
    if (languageInfo(language).markStress && !word.dictionaryForm.normalize("NFD").includes(STRESS_MARK)) issues.add("dictionary_stress");
    if (!hasValidChoices(language, word.exercise)) issues.add("workshop_options");
  }
  const measured = ordinaryWords.filter((key) => !newForms.has(key));
  const covered = measured.filter((key) => (ranks.get(key) ?? ranks.get(key.split("'").at(-1) ?? "") ?? Infinity) <= targets.band).length;
  if (measured.length < 8 || covered < measured.length * targets.share) issues.add("frequency_coverage");

  const reading = draft.reading.filter((item) => !item.listeningOnly);
  const evidenceInText = (references: number[]) => references.every((index) => sentences[index] !== undefined);
  if (reading.length !== 4 || !reading.some((item) => item.skill === "gist") || !reading.some((item) => item.skill === "detail") ||
    (level !== "A2" && !reading.some((item) => item.skill === "inference"))) issues.add("reading_mix");
  for (const item of draft.reading) {
    if (!hasValidChoices(language, item) || !evidenceInText(item.evidence) ||
      (item.listeningOnly && item.evidence.some((index) => index < from || index > to)) ||
      item.evidence.some((index) => item.options.some((option) => formKey(language, option) === formKey(language, sentences[index] ?? "")))) issues.add("reading_evidence");
  }
  if (!grammarFor(cell).some(({ id }) => id === draft.grammar.id) || new Set(draft.grammar.evidence).size < 3 ||
    !evidenceInText(draft.grammar.evidence)) issues.add("grammar_evidence");
  for (const item of [...draft.wordGaps, ...draft.grammar.gaps]) {
    if (sentences[item.sentence] !== `${item.before}${item.removed}${item.after}` || !item.accept.includes(item.removed)) issues.add("invalid_gap");
  }

  if (countWords(language, draft.writingTask) > 40) issues.add("writing_task");
  if (previous.some((other) => trigramSimilarity(language, other, body) >= 0.4)) issues.add("similarity");
  return [...issues];
}
