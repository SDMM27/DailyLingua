import type fr from "../messages/fr.json";

/** Interface languages: data, not code. Adding one = a JSON file in `messages/` and its entry in `loaders`. */
export const uiLocales = ["fr", "en"] as const;
export type UiLocale = (typeof uiLocales)[number];

export const defaultUiLocale: UiLocale = "en";

/** French is the reference: the other languages must have exactly its keys and variables. */
export type Messages = typeof fr;

const loaders: Record<UiLocale, () => Promise<{ default: Messages }>> = {
  fr: () => import("../messages/fr.json"),
  en: () => import("../messages/en.json"),
};

function isUiLocale(value: string): value is UiLocale {
  return (uiLocales as readonly string[]).includes(value);
}

/** Available locale for a BCP 47 tag (`fr-CA` → `fr`), or null. */
function matchLocale(tag: string): UiLocale | null {
  const base = tag.trim().toLowerCase().split("-")[0] ?? "";
  return isUiLocale(base) ? base : null;
}

/** Language tags of an `Accept-Language` header, most preferred first (ties keep header order). */
function acceptedTags(header: string): string[] {
  return header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q === undefined ? 1 : Number(q.slice(2));
      return { tag: tag.trim(), weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter((entry) => entry.tag !== "" && entry.tag !== "*" && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .map((entry) => entry.tag);
}

/**
 * The requested locale if available, else the first available language of the `Accept-Language`
 * header, else `defaultUiLocale`.
 */
export function resolveUiLocale(requested: string | null | undefined, acceptLanguage?: string | null): UiLocale {
  const fromRequest = requested ? matchLocale(requested) : null;
  if (fromRequest) return fromRequest;
  for (const tag of acceptLanguage ? acceptedTags(acceptLanguage) : []) {
    const match = matchLocale(tag);
    if (match) return match;
  }
  return defaultUiLocale;
}

export async function loadMessages(locale: UiLocale): Promise<Messages> {
  return (await loaders[locale]()).default;
}

/** Flat list of the dotted keys of a messages tree, in document order. */
export function messageKeys(messages: object, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    return typeof value === "object" && value !== null ? messageKeys(value, path) : [path];
  });
}
