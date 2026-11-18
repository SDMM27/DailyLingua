import {
  saveEnrollmentsInputSchema,
  type Enrollment,
  type SaveEnrollmentsInput,
  type SkillEstimate,
} from "@dailylingua/schemas";
import { appSchema, type AppClient } from "./client";
import { DataError, toDataError } from "./errors";
import { toEnrollment, toEnrollmentsPayload, toSkillEstimate } from "./mappers";

/** Active enrollments of the signed-in user, in plan order. */
export async function listEnrollments(client: AppClient): Promise<Enrollment[]> {
  const { data, error } = await appSchema(client)
    .from("enrollment")
    .select("*")
    .eq("active", true)
    .order("position", { ascending: true });
  if (error) throw toDataError(error);
  return data.map(toEnrollment);
}

/** Skill estimates of the signed-in user for one language. */
export async function listSkillEstimates(client: AppClient, language: string): Promise<SkillEstimate[]> {
  const { data, error } = await appSchema(client).from("skill_estimate").select("*").eq("language", language);
  if (error) throw toDataError(error);
  return data.map(toSkillEstimate);
}

/**
 * Replaces the learning plan: the languages of `input` become active, in that order; the others
 * become inactive (never deleted). Validates the input, then calls `app.save_enrollments`.
 */
export async function saveEnrollments(client: AppClient, input: SaveEnrollmentsInput): Promise<Enrollment[]> {
  const parsed = saveEnrollmentsInputSchema.safeParse(input);
  if (!parsed.success) throw new DataError("invalid");
  const { data, error } = await appSchema(client).rpc("save_enrollments", {
    p_enrollments: toEnrollmentsPayload(parsed.data),
  });
  if (error) throw toDataError(error);
  if (!data) throw new DataError("unknown");
  return data.map(toEnrollment);
}
