import { CEFR_LEVELS } from "@/lib/schemas/common";
import {
  PLACEMENT_GAP,
  PLACEMENT_ITEMS_PER_LEVEL,
  PLACEMENT_SKILLS,
  PLACEMENT_VARIANTS,
  placementBankSchema,
} from "@/lib/schemas/placement";

/**
 * Problems of a placement bank against the mechanical authoring rules (AUTHORING.md); empty when
 * the bank is valid. Shared by the unit test and `npm run placement:check`.
 */
export function checkPlacementBank(code: string, raw: unknown): string[] {
  const parsed = placementBankSchema.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  }
  const bank = parsed.data;
  const problems: string[] = [];
  if (bank.language !== code) problems.push(`language is ${bank.language}, expected ${code}`);

  const ids = new Set<string>();
  for (const variant of PLACEMENT_VARIANTS) {
    const items = bank.variants[variant];
    const letter = variant === "everyday" ? "e" : "p";
    items.forEach((item, index) => {
      const level = CEFR_LEVELS[Math.floor(index / PLACEMENT_ITEMS_PER_LEVEL)];
      const n = (index % PLACEMENT_ITEMS_PER_LEVEL) + 1;
      const skill = PLACEMENT_SKILLS[n - 1];
      const expectedId = `${code}-${letter}-${level.toLowerCase()}-${n}`;
      if (item.level !== level) problems.push(`${variant}[${index}] is ${item.level}, expected ${level}`);
      if (item.skill !== skill) problems.push(`${variant}[${index}] is ${item.skill}, expected ${skill}`);
      if (item.id !== expectedId) problems.push(`${variant}[${index}] id ${item.id}, expected ${expectedId}`);
      if (ids.has(item.id)) problems.push(`duplicate id ${item.id}`);
      ids.add(item.id);
      if (item.skill !== "reading" && item.prompt.split(PLACEMENT_GAP).length !== 2) {
        problems.push(`${item.id}: the prompt must contain the gap ${PLACEMENT_GAP} exactly once`);
      }
    });
    const counts = [0, 1, 2, 3].map((i) => items.filter((item) => item.answer === i).length);
    if (counts.some((c) => c < 4 || c > 5)) {
      problems.push(`${variant}: answer positions ${counts.join("/")}, each must be used 4 or 5 times`);
    }
  }
  return problems;
}
