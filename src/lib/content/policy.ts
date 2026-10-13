import { contentLicensePolicySchema, type ContentLicensePolicy } from "@/lib/schemas/content";

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
