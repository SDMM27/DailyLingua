import { z } from "zod";
import { dateKeySchema, languageSchema } from "./common";
import { topicSchema } from "./preferences";

/** The domain the learner asked for the mission of `date`, for one language (« Demain, plutôt : sport »). */
export const missionRequestSchema = z.object({
  date: dateKeySchema,
  language: languageSchema,
  topic: topicSchema,
});
export type MissionRequest = z.infer<typeof missionRequestSchema>;

/** Said when the mission of the day is already written: shown as is, and how the form knows to freeze the choice. */
export const MISSION_READY_MESSAGE = "La mission de ce jour est déjà prête : son domaine ne peut plus changer.";

/** Input of the server action: the date is never sent, the server works it out from the schedule. */
export const setNextTopicInputSchema = z.object({
  language: languageSchema,
  /** Null: « Au hasard de mes sujets », no preferred domain. */
  topic: topicSchema.nullable(),
});
export type SetNextTopicInput = z.infer<typeof setNextTopicInputSchema>;
