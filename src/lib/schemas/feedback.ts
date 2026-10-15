import { z } from "zod";

export const FEEDBACK_CATEGORIES = ["bug", "idee", "contenu", "autre"] as const;
export const feedbackCategorySchema = z.enum(FEEDBACK_CATEGORIES);
export type FeedbackCategory = z.infer<typeof feedbackCategorySchema>;

export const FEEDBACK_MESSAGE_MIN = 3;
export const FEEDBACK_MESSAGE_MAX = 2000;
export const FEEDBACK_PAGE_MAX = 200;

/** A path of this app ("/mission"): never another site, protocol-relative URL or backslash trick. */
export function isInternalPath(value: string): boolean {
  return (
    value.length <= FEEDBACK_PAGE_MAX &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

/** Shape accepted from the feedback form. An invalid `page` is dropped rather than refused. */
export const feedbackInputSchema = z.object({
  category: feedbackCategorySchema,
  message: z
    .string()
    .trim()
    .min(FEEDBACK_MESSAGE_MIN, "Écris au moins quelques mots.")
    .max(FEEDBACK_MESSAGE_MAX, `Ton message est trop long (${FEEDBACK_MESSAGE_MAX} caractères maximum).`),
  page: z
    .string()
    .refine(isInternalPath)
    .optional()
    .catch(undefined),
});
export type FeedbackInput = z.infer<typeof feedbackInputSchema>;

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "Bug",
  idee: "Idée",
  contenu: "Contenu d’une langue",
  autre: "Autre",
};

/** Message the database raises (SQLSTATE DL429) when a user sent 20 feedback in 24 hours. */
export const FEEDBACK_RATE_LIMIT_SQLSTATE = "DL429";
export const FEEDBACK_RATE_LIMIT_MESSAGE = "Tu as envoyé beaucoup de retours aujourd’hui, réessaie demain.";
