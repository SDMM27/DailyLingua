import { z } from "zod";
import { dateKeySchema } from "./common";

/**
 * Approved by two independent passes of the reviewer agents, then the arbiter
 * (.claude/agents/relecteur-natif.md, arbitre-relecture.md); `rubric` = version of the grid.
 */
export const aiReviewSchema = z.object({
  on: dateKeySchema,
  model: z.string().trim().min(1).max(60),
  rubric: z.string().trim().min(1).max(40),
});
export type AiReview = z.infer<typeof aiReviewSchema>;
