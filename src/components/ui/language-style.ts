import { type Accent, languageInfo } from "@/lib/domain/languages";
import type { Language } from "@/lib/schemas/common";

export interface AccentStyle {
  text: string;
  bg: string;
  softBg: string;
}

/** Static class names per accent (Tailwind can only see literal class strings). */
const ACCENT_STYLE: Record<Accent, AccentStyle> = {
  indigo: { text: "text-indigo", bg: "bg-indigo", softBg: "bg-indigo-soft" },
  terracotta: { text: "text-terracotta", bg: "bg-terracotta", softBg: "bg-terracotta-soft" },
  olive: { text: "text-olive", bg: "bg-olive", softBg: "bg-olive-soft" },
  plum: { text: "text-plum", bg: "bg-plum", softBg: "bg-plum-soft" },
  teal: { text: "text-teal", bg: "bg-teal", softBg: "bg-teal-soft" },
  ochre: { text: "text-ochre", bg: "bg-ochre", softBg: "bg-ochre-soft" },
};

export function languageStyle(language: Language): AccentStyle {
  return ACCENT_STYLE[languageInfo(language).accent];
}
