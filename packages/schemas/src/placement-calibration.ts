import { z } from "zod";

/** Row of `app.assessment_result` as exported for the placement calibration (the payload is the legacy test row). */
export const placementResultRowSchema = z.object({
  user_id: z.string().min(1),
  language: z.string().min(1),
  kind: z.string(),
  taken_at: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Date invalide"),
  payload: z.unknown(),
});
export type PlacementResultRow = z.infer<typeof placementResultRowSchema>;

/** Payload of a completed placement test: the bank version and the answers in the order asked (correctness is replayed against the bank). */
export const placementPayloadSchema = z.object({
  status: z.literal("completed"),
  bank_version: z.string().min(1),
  answers: z.array(z.object({
    itemId: z.string().min(1),
    choice: z.number().int().min(0).max(3).nullable(),
  })),
});
export type PlacementPayload = z.infer<typeof placementPayloadSchema>;
