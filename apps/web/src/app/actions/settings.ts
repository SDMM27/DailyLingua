"use server";

import { isValidNativeLanguage } from "@dailylingua/core";
import { getProfile, saveGameSettings, saveKnownLanguages, saveProfile } from "@dailylingua/data";
import { knownLanguagesSchema } from "@dailylingua/schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveErrorKey, type SaveErrorKey } from "@/lib/data-errors";
import { rememberLocale } from "@/lib/locale-cookie";
import { learningSettingsSchema, uiLanguageSchema } from "@/lib/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SettingsState = { saved?: true; error?: SaveErrorKey };

/**
 * These actions read the profile with their own client, not with the per-render helpers of
 * `lib/session`: a value read before a save would be served again by the page that is rendered
 * right after it, with the old language.
 */
async function signedInClient() {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/sign-in");
  return client;
}

/** Changes the interface language: saved in the profile and in the cookie, effective at once. */
export async function setInterfaceLanguage(language: string): Promise<SettingsState> {
  const parsed = uiLanguageSchema.safeParse(language);
  if (!parsed.success) return { error: "invalid" };
  const client = await signedInClient();
  try {
    const profile = await getProfile(client);
    if (!profile) return { error: "notFound" };
    await saveProfile(client, {
      nativeLanguage: profile.nativeLanguage,
      uiLanguage: parsed.data,
      timeZone: profile.timeZone,
      reminderTime: profile.reminderTime,
    });
  } catch (error) {
    console.error("setInterfaceLanguage failed", error);
    return { error: saveErrorKey(error) };
  }
  await rememberLocale(parsed.data);
  revalidatePath("/", "layout");
  return { saved: true };
}

/**
 * Saves the mother tongue and the time zone. Once the app has ingested events, `app.save_profile`
 * ignores the time zone it receives: the time zone then follows the device that sends learning events.
 */
export async function saveLearningSettings(_previous: SettingsState, formData: FormData): Promise<SettingsState> {
  const parsed = learningSettingsSchema.safeParse({
    nativeLanguage: formData.get("nativeLanguage"),
    timeZone: formData.get("timeZone"),
    reminderTime: "",
  });
  if (!parsed.success) return { error: "invalid" };
  const client = await signedInClient();
  try {
    const profile = await getProfile(client);
    if (!profile) return { error: "notFound" };
    await saveProfile(client, {
      nativeLanguage: parsed.data.nativeLanguage,
      uiLanguage: profile.uiLanguage,
      timeZone: parsed.data.timeZone,
      reminderTime: profile.reminderTime,
    });
  } catch (error) {
    console.error("saveLearningSettings failed", error);
    return { error: saveErrorKey(error) };
  }
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function saveGamePreferences(_previous: SettingsState, formData: FormData): Promise<SettingsState> {
  const client = await signedInClient();
  try {
    await saveGameSettings(client, {
      xpVisible: formData.get("xpVisible") === "on",
      streak: { enabled: formData.get("streakEnabled") === "on" },
      celebrations: formData.get("celebrations") === "on" ? "full" : "reduced",
    });
  } catch (error) {
    console.error("saveGamePreferences failed", error);
    return { error: saveErrorKey(error) };
  }
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function saveKnownLanguageSettings(_previous: SettingsState, formData: FormData): Promise<SettingsState> {
  const parsed = knownLanguagesSchema.safeParse(formData.getAll("language"));
  if (!parsed.success || !parsed.data.every(isValidNativeLanguage)) return { error: "invalid" };
  const client = await signedInClient();
  try {
    await saveKnownLanguages(client, parsed.data);
  } catch (error) {
    console.error("Saving known languages failed", error);
    return { error: saveErrorKey(error) };
  }
  revalidatePath("/settings");
  revalidatePath("/library/[id]", "page");
  return { saved: true };
}
