"use server";

import { saveEnrollments, saveProfile } from "@dailylingua/data";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { rememberLocale } from "@/lib/locale-cookie";
import { completeOnboardingSchema } from "@/lib/onboarding";
import { saveErrorKey, type SaveErrorKey } from "@/lib/data-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OnboardingResult = { error: SaveErrorKey };

/**
 * Saves what the installation collected: the profile (mother tongue, current interface language,
 * browser time zone), then the learning plan (one language, every day). Goes to Today on success.
 * Returns an error key to translate; the input is validated here, never trusted from the client.
 */
export async function completeOnboarding(input: unknown): Promise<OnboardingResult> {
  const parsed = completeOnboardingSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const value = parsed.data;

  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/sign-in");

  const uiLanguage = await getLocale();
  try {
    await saveProfile(client, {
      nativeLanguage: value.nativeLanguage,
      uiLanguage,
      timeZone: value.timeZone,
      reminderTime: null,
    });
    await saveEnrollments(client, [
      { language: value.targetLanguage, dailyMinutes: value.dailyMinutes, startLevel: value.startLevel },
    ]);
  } catch (error) {
    console.error("completeOnboarding failed", error);
    return { error: saveErrorKey(error) };
  }
  await rememberLocale(uiLanguage);
  redirect("/");
}
