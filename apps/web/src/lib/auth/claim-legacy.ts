import { claimLegacyData, DataError, type AppClient } from "@dailylingua/data";

/**
 * After a successful sign-in: brings the data of the old app along (`app.claim_legacy_data`, with the client of the
 * user). A failure never blocks the sign-in: it is logged without personal data (the error code only) and the user
 * goes on, to retry at the next sign-in.
 */
export async function claimLegacyDataQuietly(client: AppClient): Promise<void> {
  try {
    await claimLegacyData(client);
  } catch (error) {
    const code = error instanceof DataError ? `${error.code} ${error.sqlstate ?? ""}`.trim() : "unexpected";
    console.error(`claimLegacyData failed (${code})`);
  }
}

/** A copy of the old app younger than this is not refreshed again. */
export const LEGACY_COPY_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Whether the home screen should resynchronise the old app's data: a full account that has not written in the new
 * app yet (`appActiveSince` null) and whose last resynchronisation is missing or older than an hour.
 */
export function legacyCopyIsStale(
  profile: { isGuest: boolean; appActiveSince: string | null; legacyMigratedAt: string | null },
  now: Date = new Date(),
): boolean {
  if (profile.isGuest || profile.appActiveSince !== null) return false;
  if (profile.legacyMigratedAt === null) return true;
  return now.getTime() - new Date(profile.legacyMigratedAt).getTime() > LEGACY_COPY_MAX_AGE_MS;
}

/** Claims when the copy is stale (never throws). True when a claim was attempted: the profile must be read again. */
export async function refreshLegacyDataIfStale(
  client: AppClient,
  profile: Parameters<typeof legacyCopyIsStale>[0],
  now: Date = new Date(),
): Promise<boolean> {
  if (!legacyCopyIsStale(profile, now)) return false;
  await claimLegacyDataQuietly(client);
  return true;
}
