import type { DateKey } from "@/lib/schemas/common";
import type {
  ModeRetention,
  RetentionStats,
  ReviewGrade,
  ReviewMode,
  VocabularyItem,
} from "@/lib/schemas/vocabulary";
import { REVIEW_MODES } from "@/lib/schemas/vocabulary";
import { seededRandom } from "./alphabet";
import { normalizeGrammarAnswer, normalizeTypedText } from "./grammar";
import { languageInfo } from "./languages";
import { STRESS_MARK, stripStress } from "./stress";

export { REVIEW_MODES };

/** Reviews made at least this many days after the previous one measure retention. */
export const RETENTION_MIN_DELAY_DAYS = 7;
/** A mode is shown from this many measured reviews. */
export const RETENTION_MIN_REVIEWS_PER_MODE = 10;
/** Below this many measured reviews in all, the figures are only indicative. */
export const RETENTION_MIN_REVIEWS_TOTAL = 30;
export const RETENTION_WINDOW_DAYS = 90;

type ModeItem = Pick<VocabularyItem, "id" | "language" | "term" | "translation" | "example"> & {
  review: Pick<VocabularyItem["review"], "box">;
};

export interface ClozeSentence {
  before: string;
  after: string;
}

/**
 * The example around the first occurrence of the term, or null when the term is not in it as
 * written. For languages that mark stress the stress marks of the term and of the example are
 * ignored (the term of a Russian word carries one, the example usually does not).
 */
export function clozeSentence(item: Pick<VocabularyItem, "language" | "term" | "example">): ClozeSentence | null {
  if (!item.example) return null;
  const example = item.example.normalize("NFC");
  const ignoreStress = languageInfo(item.language).markStress === true;
  let plain = "";
  // Offset in `example` of each character of `plain`, plus the end of the example.
  const offsets: number[] = [];
  for (let i = 0; i < example.length; i++) {
    if (ignoreStress && example[i] === STRESS_MARK) continue;
    plain += example[i];
    offsets.push(i);
  }
  offsets.push(example.length);
  const lowerPlain = plain.toLowerCase();
  // Lower-casing can change the length of rare characters; the offsets would then be wrong.
  if (lowerPlain.length !== plain.length) return null;

  const normalizedTerm = item.term.normalize("NFC").trim();
  const term = (ignoreStress ? stripStress(normalizedTerm) : normalizedTerm).toLowerCase();
  if (term === "") return null;
  const index = lowerPlain.indexOf(term);
  if (index < 0) return null;
  return {
    before: example.slice(0, offsets[index]),
    after: example.slice(offsets[index + term.length]),
  };
}

function eligibleModes(box: number): ReviewMode[] {
  if (box <= 0) return ["flip"];
  if (box === 1) return ["flip", "translate"];
  if (box <= 3) return ["translate", "listen", "cloze"];
  return ["produce", "listen", "cloze"];
}

/**
 * The mode a word is reviewed in. In a mixed session it depends on the Leitner box; the draw is
 * seeded by word and day so the mode does not change within the day. `fixed` is the learner's
 * choice for the whole session: listen and cloze fall back to translate when they are impossible.
 */
export function chooseReviewMode(
  item: ModeItem,
  today: DateKey,
  { canListen, fixed }: { canListen: boolean; fixed?: ReviewMode },
): ReviewMode {
  const hasCloze = clozeSentence(item) !== null;
  if (fixed) {
    if ((fixed === "listen" && !canListen) || (fixed === "cloze" && !hasCloze)) return "translate";
    return fixed;
  }
  const modes = eligibleModes(item.review.box).filter(
    (mode) => (mode !== "listen" || canListen) && (mode !== "cloze" || hasCloze),
  );
  if (modes.length === 0) return "translate";
  return modes[Math.floor(seededRandom(`${item.id}:${today}`)() * modes.length)];
}

export type TypedCheck = "right" | "close" | "wrong";

const LEADING_ARTICLE = /^(?:(?:le|la|les|un|une|des|se)\s+|l'|s')/;

function withoutArticle(value: string): string {
  return value.replace(LEADING_ARTICLE, "");
}

function translationAnswers(translation: string): string[] {
  const withoutParentheses = translation.replace(/\([^)]*\)/g, " ");
  const parts = withoutParentheses.split(/[,;/]/).map((part) => part.trim());
  return [...parts, translation.trim()].filter((part) => part !== "");
}

function termAnswers(term: string): string[] {
  return [term, ...term.split(" / ")].map((part) => part.trim()).filter((part) => part !== "");
}

function stripMarks(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

function distanceIsOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  return short.slice(i) === long.slice(i + 1);
}

/** Grades a typed answer: `close` is right but for accents, or a single letter off a word of 5+ letters. */
export function checkTypedAnswer(mode: ReviewMode, item: ModeItem, given: string): TypedCheck {
  const isTranslate = mode === "translate";
  // The translation is in French, which is not a language of the registry.
  const normalize = (text: string) => (isTranslate ? normalizeTypedText(text) : normalizeGrammarAnswer(item.language, text));
  const typed = normalize(given);
  if (typed === "") return "wrong";

  const expected = [
    ...new Set(
      (isTranslate ? translationAnswers(item.translation) : termAnswers(item.term)).map(normalize),
    ),
  ].filter((answer) => answer !== "");
  const forms = (value: string) => (isTranslate ? [value, withoutArticle(value)] : [value]);
  const typedForms = forms(typed);

  if (expected.some((answer) => forms(answer).some((form) => typedForms.includes(form)))) return "right";

  for (const answer of expected) {
    for (const form of forms(answer)) {
      for (const candidate of typedForms) {
        if (stripMarks(candidate) === stripMarks(form)) return "close";
        if (form.length >= 5 && distanceIsOne(stripMarks(candidate), stripMarks(form))) return "close";
      }
    }
  }
  return "wrong";
}

export function gradeForCheck(result: TypedCheck): ReviewGrade {
  if (result === "right") return "good";
  if (result === "close") return "hard";
  return "again";
}

export interface RetentionRow {
  mode: ReviewMode;
  grade: ReviewGrade;
  daysSinceLast: number | null;
}

/** Recall rate per mode among the reviews made at least `RETENTION_MIN_DELAY_DAYS` after the previous one. */
export function retentionByMode(rows: readonly RetentionRow[]): RetentionStats {
  const byMode = Object.fromEntries(REVIEW_MODES.map((mode) => [mode, { reviews: 0, recalled: 0 }])) as Record<
    ReviewMode,
    ModeRetention
  >;
  const total: ModeRetention = { reviews: 0, recalled: 0 };
  for (const row of rows) {
    if (row.daysSinceLast === null || row.daysSinceLast < RETENTION_MIN_DELAY_DAYS) continue;
    const recalled = row.grade === "again" ? 0 : 1;
    byMode[row.mode].reviews += 1;
    byMode[row.mode].recalled += recalled;
    total.reviews += 1;
    total.recalled += recalled;
  }
  return { total, byMode };
}
