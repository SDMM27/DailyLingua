import { z } from "zod";
import { LANGUAGE_CODES } from "@/lib/domain/languages";

export const languageSchema = z.enum(LANGUAGE_CODES);
export type { Language } from "@/lib/domain/languages";

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const cefrLevelSchema = z.enum(CEFR_LEVELS);
export type CefrLevel = z.infer<typeof cefrLevelSchema>;

export const CONTENT_TYPES = ["article", "podcast", "video", "interview"] as const;
export const contentTypeSchema = z.enum(CONTENT_TYPES);
export type ContentType = z.infer<typeof contentTypeSchema>;

/** Calendar day in YYYY-MM-DD, always interpreted in the user's time zone. */
export const dateKeySchema = z.iso.date();
export type DateKey = z.infer<typeof dateKeySchema>;
