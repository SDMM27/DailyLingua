import { z } from "zod";
import { TOPICS } from "./preferences";

/**
 * Wire format of the domain classifier: what the model returns. The enum keeps the answer to the
 * twelve domains; the count per item and the indexes are checked on our side.
 */
export const wireContentTopicsSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int().describe("The index of the item, as given."),
      topics: z.array(z.enum(TOPICS)).describe("0 to 3 domains of the item, the most relevant first."),
    }),
  ),
});
export type WireContentTopics = z.infer<typeof wireContentTopicsSchema>;
