import { LANGUAGE_CODES, type Language } from "@/lib/domain/languages";
import { TOPICS, type Topic } from "@/lib/schemas/preferences";
import { CEFR_LEVELS, type CefrLevel, type ContentType } from "@/lib/schemas/common";
import type { SourceDefinition } from "@/lib/schemas/content";

export type CoverageMatrix = Record<Language, Record<CefrLevel, number>>;

export function emptyMatrix(): CoverageMatrix {
  return Object.fromEntries(
    LANGUAGE_CODES.map((l) => [l, Object.fromEntries(CEFR_LEVELS.map((c) => [c, 0]))]),
  ) as CoverageMatrix;
}

/**
 * Number of sources of a content type able to yield each level: a source counts for its `difficulty`
 * and for every level its `levelRules` can assign.
 */
export function catalogCoverage(catalog: SourceDefinition[], type: ContentType): CoverageMatrix {
  const matrix = emptyMatrix();
  for (const s of catalog) {
    if (s.contentType !== type) continue;
    const levels = new Set<CefrLevel>([s.difficulty, ...(s.levelRules ?? []).map((r) => r.difficulty)]);
    for (const level of levels) matrix[s.language][level] += 1;
  }
  return matrix;
}

export type TopicCoverageMatrix = Record<Topic, Record<CefrLevel, number>>;

/**
 * Topic × level counts of the contents of one language. A content counts once for each of its
 * domains; an unclassified one (topics null) counts for none, and `unclassified` tells how many.
 */
export function topicCoverage(
  rows: readonly { language: Language; difficulty: CefrLevel; topics: readonly string[] | null }[],
  language: Language,
): { matrix: TopicCoverageMatrix; unclassified: number } {
  const matrix = Object.fromEntries(
    TOPICS.map((t) => [t, Object.fromEntries(CEFR_LEVELS.map((c) => [c, 0]))]),
  ) as TopicCoverageMatrix;
  let unclassified = 0;
  for (const row of rows) {
    if (row.language !== language) continue;
    if (row.topics === null) {
      unclassified += 1;
      continue;
    }
    for (const topic of new Set(row.topics)) {
      if (topic in matrix) matrix[topic as Topic][row.difficulty] += 1;
    }
  }
  return { matrix, unclassified };
}

/** Plain-text table, one row per domain; an empty cell is shown as « · ». */
export function renderTopicMatrix(matrix: TopicCoverageMatrix, empty = "    ·"): string {
  const pad = (s: string, n: number) => s.padStart(n);
  const width = Math.max(...TOPICS.map((t) => t.length));
  const head = `${"".padEnd(width)} ${CEFR_LEVELS.map((l) => pad(l, 5)).join("")}`;
  const lines = TOPICS.map((topic) => {
    const cells = CEFR_LEVELS.map((l) => (matrix[topic][l] === 0 ? empty : pad(String(matrix[topic][l]), 5)));
    return `${topic.padEnd(width)} ${cells.join("")}`;
  });
  return [head, ...lines].join("\n");
}

/** Plain-text table, one row per language; an empty cell is shown as « · · » so it stands out. */
export function renderMatrix(matrix: CoverageMatrix, empty = "    ·"): string {
  const pad = (s: string, n: number) => s.padStart(n);
  const head = `lang ${CEFR_LEVELS.map((l) => pad(l, 5)).join("")}`;
  const lines = LANGUAGE_CODES.map((lang) => {
    const cells = CEFR_LEVELS.map((l) => (matrix[lang][l] === 0 ? empty : pad(String(matrix[lang][l]), 5)));
    return `${lang.padEnd(4)} ${cells.join("")}`;
  });
  const missing = LANGUAGE_CODES.flatMap((lang) => CEFR_LEVELS.filter((l) => matrix[lang][l] === 0).map((l) => `${lang}/${l}`));
  return [head, ...lines, "", `Cases vides : ${missing.length}${missing.length ? ` (${missing.join(" ")})` : ""}`].join("\n");
}
