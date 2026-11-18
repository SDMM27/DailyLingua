import { saveProfileInputSchema, type Profile, type SaveProfileInput } from "@dailylingua/schemas";
import { appSchema, type AppClient } from "./client";
import { DataError, toDataError } from "./errors";
import { toProfile } from "./mappers";

/** The signed-in user's profile (row-level security keeps the query to their own row), or null. */
export async function getProfile(client: AppClient): Promise<Profile | null> {
  const { data, error } = await appSchema(client).from("profile").select("*").maybeSingle();
  if (error) throw toDataError(error);
  return data ? toProfile(data) : null;
}

/** Validates the input, then calls `app.save_profile`, which acts on `auth.uid()`. */
export async function saveProfile(client: AppClient, input: SaveProfileInput): Promise<Profile> {
  const parsed = saveProfileInputSchema.safeParse(input);
  if (!parsed.success) throw new DataError("invalid");
  const { data, error } = await appSchema(client).rpc("save_profile", {
    p_native_language: parsed.data.nativeLanguage,
    p_ui_language: parsed.data.uiLanguage,
    p_time_zone: parsed.data.timeZone,
    // Omitted (not null) when there is no reminder: the SQL default clears it.
    ...(parsed.data.reminderTime === null ? {} : { p_reminder_time: parsed.data.reminderTime }),
  });
  if (error) throw toDataError(error);
  if (!data) throw new DataError("unknown");
  return toProfile(data);
}
