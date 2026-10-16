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

/** Until users can declare their subscriptions, only free sources are proposed. */
export const DEFAULT_READABLE_ACCESS: readonly SourceAccess[] = ["free"];

/** Whether a source with this access level can be read by someone who can read `readable`. */
export function isReadable(access: SourceAccess, readable: readonly SourceAccess[] = DEFAULT_READABLE_ACCESS): boolean {
  return readable.includes(access);
}
