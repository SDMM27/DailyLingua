import { LANGUAGE_CODES, type Language } from "@/lib/domain/languages";
import type { ContentLicensePolicy, SourceAccess, SourceDefinition } from "@/lib/schemas/content";
import { DEFAULT_READABLE_ACCESS, isReadable } from "./policy";

/**
 * Languages that can be studied: those with at least one source of the catalogue usable under
 * the licence policy and readable by the user (access level). Without a source there is nothing
 * to read and no mission to build, so a language without one is not offered. Registry order.
 */
export function availableLanguages(
  catalog: readonly SourceDefinition[],
  policy: ContentLicensePolicy,
  readable: readonly SourceAccess[] = DEFAULT_READABLE_ACCESS,
): Language[] {
  const covered = new Set(
    catalog
      .filter((s) => (policy === "all" || s.license.commercialUse) && isReadable(s.access ?? "free", readable))
      .map((s) => s.language),
  );
  return LANGUAGE_CODES.filter((code) => covered.has(code));
}
