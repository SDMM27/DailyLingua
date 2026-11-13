import { getProfile } from "@dailylingua/data";
import type { Profile } from "@dailylingua/schemas";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Per-request helpers for Server Components and the request configuration of next-intl. They are
 * memoised for one render: Server Actions that save something must not use them (a value read
 * before the write would be served again after it) and create their own client instead.
 */

export const getRequestClient = cache(createSupabaseServerClient);

export interface SessionUser {
  id: string;
  email: string | null;
  isGuest: boolean;
}

/** The user, validated with Supabase Auth (not just read from the cookie), or null. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const client = await getRequestClient();
  const { data } = await client.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null, isGuest: data.user.is_anonymous === true };
});

/** The profile of the signed-in user, or null (signed out, or the profile is not created yet). */
export const getSessionProfile = cache(async (): Promise<Profile | null> => {
  if (!(await getSessionUser())) return null;
  const client = await getRequestClient();
  return getProfile(client);
});
