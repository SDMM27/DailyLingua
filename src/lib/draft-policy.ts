export type DraftPolicy = "show" | "hide";

/**
 * Reads a "show" / "hide" variable that decides whether content no native speaker has approved
 * yet is shown. Defaults to "hide" in production (`VERCEL_ENV`), "show" elsewhere. A wrong value
 * fails loudly rather than silently showing drafts.
 */
export function readDraftPolicy(variable: string, source: Record<string, string | undefined>): DraftPolicy {
  const raw = source[variable]?.trim();
  if (!raw) return source.VERCEL_ENV === "production" ? "hide" : "show";
  if (raw === "show" || raw === "hide") return raw;
  throw new Error(`${variable} invalide : « ${raw} » (valeurs : show, hide).`);
}
