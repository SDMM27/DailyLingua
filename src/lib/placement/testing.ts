import { CEFR_LEVELS } from "@/lib/schemas/common";
import type { PlacementItem } from "@/lib/schemas/placement";

const SKILL_OF_POSITION = ["grammar", "grammar", "grammar", "grammar", "vocabulary", "vocabulary", "vocabulary", "reading", "reading", "reading"] as const;

/** Test helper: a valid current-format bank (60 questions), the right answer rotating over 0..3. */
export function buildFlatItems(code = "xx"): PlacementItem[] {
  return CEFR_LEVELS.flatMap((level, l) =>
    SKILL_OF_POSITION.map((skill, i) => ({
      id: `${code}-${level.toLowerCase()}-${i + 1}`,
      level,
      skill,
      ...(skill === "reading" ? { context: `Texte ${level} ${i + 1}` } : {}),
      prompt: skill === "reading" ? `Question ${level} ${i + 1}` : `${level} ${i + 1} ___`,
      options: ["a", "b", "c", "d"] as [string, string, string, string],
      answer: (l * 10 + i) % 4,
    })),
  );
}

