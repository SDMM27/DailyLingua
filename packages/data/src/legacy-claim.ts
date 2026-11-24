import { appSchema, type AppClient } from "./client";
import { DataError } from "./errors";
import { unwrap } from "./query";

/** Why `app.claim_legacy_data` did nothing. */
export const legacyClaimSkips = ["guest", "no_legacy", "active", "rate_limited"] as const;
export type LegacyClaimSkip = (typeof legacyClaimSkips)[number];

/** `skipped` is null when the data of the old app was resynchronised. */
export interface LegacyClaim {
  skipped: LegacyClaimSkip | null;
}

/**
 * Brings the data of the signed-in user's old account along (`app.claim_legacy_data`, which acts on `auth.uid()`
 * only). Idempotent and rate limited by the database. Throws a `DataError`: a caller that must not fail because of it
 * (sign-in) catches it.
 */
export async function claimLegacyData(client: AppClient): Promise<LegacyClaim> {
  const data = unwrap(await appSchema(client).rpc("claim_legacy_data"));
  if (data === null || typeof data !== "object" || Array.isArray(data)) throw new DataError("unknown");
  const skipped = data.skipped;
  if (skipped === undefined || skipped === null) return { skipped: null };
  const known = legacyClaimSkips.find((reason) => reason === skipped);
  if (!known) throw new DataError("unknown");
  return { skipped: known };
}
