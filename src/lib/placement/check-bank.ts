import { CEFR_LEVELS } from "@/lib/schemas/common";
import { PLACEMENT_BANK_ITEMS_PER_LEVEL, PLACEMENT_GAP, placementBankSchema, type PlacementItem } from "@/lib/schemas/placement";

/**
 * Problems of a placement bank against the mechanical authoring rules (AUTHORING.md); empty when
 * the bank is valid. Shared by the unit test and `npm run placement:check`. A bank is a flat list
 * of 60 questions, ids `<code>-<level>-<n>`.
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
  const pattern = new RegExp(`^${code}-(a1|a2|b1|b2|c1|c2)-([1-9]|10)$`);
  bank.items.forEach((item, index) => {
    const match = pattern.exec(item.id);
    if (!match) {
      problems.push(`items[${index}] id ${item.id}, expected ${code}-<level>-<1 to ${PLACEMENT_BANK_ITEMS_PER_LEVEL}>`);
    } else if (match[1] !== item.level.toLowerCase()) {
      problems.push(`items[${index}] id ${item.id} does not match its level ${item.level}`);
    }
    if (ids.has(item.id)) problems.push(`duplicate id ${item.id}`);
    ids.add(item.id);
    problems.push(...gapProblem(item));
  });
  // The schema checked the counts and the answer positions; ids must also cover 1..10 per level.
  for (const level of CEFR_LEVELS) {
    const numbers = new Set(bank.items.filter((i) => i.level === level).map((i) => i.id.split("-").at(-1)));
    if (numbers.size !== PLACEMENT_BANK_ITEMS_PER_LEVEL) problems.push(`${level}: ids must be numbered 1 to ${PLACEMENT_BANK_ITEMS_PER_LEVEL}`);
  }
  return problems;
}

function gapProblem(item: PlacementItem): string[] {
  return item.skill !== "reading" && item.prompt.split(PLACEMENT_GAP).length !== 2
    ? [`${item.id}: the prompt must contain the gap ${PLACEMENT_GAP} exactly once`]
    : [];
}
