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
