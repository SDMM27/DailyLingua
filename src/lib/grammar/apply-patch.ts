import { z } from "zod";

/** ChatGPT's review of one language: `docs/reviews/grammar/<code>/chatgpt-patch.json`. */
export const grammarPatchSchema = z.object({
  id: z.string().min(1),
  field: z.string(),
  find: z.string().min(1),
  replace: z.string(),
});
export type GrammarPatch = z.infer<typeof grammarPatchSchema>;

export const grammarPatchFileSchema = z.object({
  language: z.string().min(1),
  approved: z.array(z.string()),
  drafts: z.array(z.string()),
  patches: z.array(grammarPatchSchema),
});
export type GrammarPatchFile = z.infer<typeof grammarPatchFileSchema>;

export type PatchFailure = { patch: GrammarPatch; reason: "not-found" | "ambiguous" };

export type ApplyPatchOptions = { pointIds: string[]; date: string; model: string; rubric: string };

export type ApplyPatchResult = {
  text: string;
  applied: GrammarPatch[];
  failed: PatchFailure[];
  approved: string[];
  drafts: string[];
  problems: string[];
};

const SPACES = "[   ]";
const APOSTROPHES = "[’']";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches `find` with any of the three spaces and either apostrophe interchangeable. */
function tolerantPattern(find: string): RegExp {
  const source = [...find]
    .map((char) => {
      if (char === " " || char === " " || char === " ") return SPACES;
      if (char === "’" || char === "'") return APOSTROPHES;
      return escapeRegExp(char);
    })
    .join("");
  return new RegExp(source, "g");
}

type Match = { index: number; length: number };

function findMatches(source: string, find: string): Match[] {
  const exact: Match[] = [];
  for (let from = source.indexOf(find); from !== -1; from = source.indexOf(find, from + find.length)) {
    exact.push({ index: from, length: find.length });
  }
  if (exact.length > 0) return exact;
  return [...source.matchAll(tolerantPattern(find))].map((m) => ({ index: m.index, length: m[0].length }));
}

function insertAiReview(text: string, id: string, line: string): { text: string; ok: boolean } {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trim() === `id: "${id}",`);
  if (start === -1) return { text, ok: false };
  let end = lines.findIndex((l, i) => i > start && /^\s*id: "/.test(l));
  if (end === -1) end = lines.length;
  const block = lines.slice(start, end);
  if (block.some((l) => l.trimStart().startsWith("aiReview:"))) return { text, ok: true };
  const offset = block.findIndex((l) => l.trimStart().startsWith("reviewedOn:"));
  if (offset === -1) return { text, ok: false };
  const indent = /^\s*/.exec(block[offset])![0];
  lines.splice(start + offset + 1, 0, `${indent}${line}`);
  return { text: lines.join("\n"), ok: true };
}

export function applyGrammarPatch(source: string, file: GrammarPatchFile, options: ApplyPatchOptions): ApplyPatchResult {
  const { pointIds, date, model, rubric } = options;
  const problems: string[] = [];
  const applied: GrammarPatch[] = [];
  const failed: PatchFailure[] = [];
  let text = source;

  for (const patch of file.patches) {
    if (!pointIds.includes(patch.id)) problems.push(`patch on unknown point "${patch.id}"`);
    const matches = findMatches(text, patch.find);
    if (matches.length !== 1) {
      failed.push({ patch, reason: matches.length === 0 ? "not-found" : "ambiguous" });
      continue;
    }
    const { index, length } = matches[0];
    text = text.slice(0, index) + patch.replace + text.slice(index + length);
    applied.push(patch);
  }

  const failedIds = new Set(failed.map((f) => f.patch.id));
  const approved = file.approved.filter((id) => !failedIds.has(id));
  const drafts = [...file.drafts, ...file.approved.filter((id) => failedIds.has(id))];

  const seen = new Map<string, number>();
  for (const id of [...file.approved, ...file.drafts]) seen.set(id, (seen.get(id) ?? 0) + 1);
  for (const id of pointIds) {
    const n = seen.get(id) ?? 0;
    if (n === 0) problems.push(`point "${id}" is neither approved nor draft`);
    else if (n > 1) problems.push(`point "${id}" is listed ${n} times`);
  }
  for (const id of seen.keys()) if (!pointIds.includes(id)) problems.push(`unknown point "${id}" in approved/drafts`);

  const review = `aiReview: { on: "${date}", model: "${model}", rubric: "${rubric}" },`;
  let reviewed = 0;
  for (const id of approved) {
    if (!pointIds.includes(id)) continue;
    const before = text;
    const result = insertAiReview(text, id, review);
    if (!result.ok) problems.push(`cannot place aiReview on "${id}" (id or reviewedOn line not found)`);
    text = result.text;
    if (text !== before) reviewed++;
  }

  if (applied.length > 0 || reviewed > 0) {
    text = text.replace(/^(\s*version: ")[^"]*(",)/m, `$1${date}$2`);
  }

  return { text, applied, failed, approved, drafts, problems };
}
