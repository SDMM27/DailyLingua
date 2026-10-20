import { LANGUAGE_CODES, type Language } from "@/lib/domain/languages";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/schemas/common";
import type { SourceDefinition } from "@/lib/schemas/content";

export type CoverageMatrix = Record<Language, Record<CefrLevel, number>>;

export function emptyMatrix(): CoverageMatrix {
  return Object.fromEntries(
    LANGUAGE_CODES.map((l) => [l, Object.fromEntries(CEFR_LEVELS.map((c) => [c, 0]))]),
  ) as CoverageMatrix;
}

/**
 * Number of video channels able to yield each level: a channel counts for its `difficulty` and for
 * every level its `levelRules` can assign.
 */
export function catalogVideoCoverage(catalog: SourceDefinition[]): CoverageMatrix {
  const matrix = emptyMatrix();
  for (const s of catalog) {
    if (s.contentType !== "video") continue;
    const levels = new Set<CefrLevel>([s.difficulty, ...(s.levelRules ?? []).map((r) => r.difficulty)]);
    for (const level of levels) matrix[s.language][level] += 1;
  }
  return matrix;
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
