import { contentLicensePolicySchema, type ContentLicensePolicy, type SourceAccess } from "@/lib/schemas/content";

/**
 * CONTENT_LICENSE_POLICY: "all" (default, personal use) or "commercial" (only sources whose terms
 * allow a paid product). A wrong value fails loudly rather than silently widening the policy.
 */
export function readContentLicensePolicy(
  source: Record<string, string | undefined> = process.env,
): ContentLicensePolicy {
  const raw = source.CONTENT_LICENSE_POLICY?.trim() || "all";
  const parsed = contentLicensePolicySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`CONTENT_LICENSE_POLICY invalide : « ${raw} » (valeurs : all, commercial).`);
  }
  return parsed.data;
}

/** Access levels everyone can read; the catalogue-level default (a language needs a free source). */
export const DEFAULT_READABLE_ACCESS: readonly SourceAccess[] = ["free"];

/** Whether a source with this access level can be read by someone who can read `readable`. */
export function isReadable(access: SourceAccess, readable: readonly SourceAccess[] = DEFAULT_READABLE_ACCESS): boolean {
  return readable.includes(access);
}

/**
 * Whether a user can read a source: it is free, or they declared they have access to it
 * (`user_source_access`). Access is per source, not per level: a subscription to one paywalled
 * publisher says nothing about another.
 */
export function isSourceReadable(
  source: { id: string; access: SourceAccess },
  declaredSourceIds: readonly string[],
): boolean {
  return source.access === "free" || declaredSourceIds.includes(source.id);
}
