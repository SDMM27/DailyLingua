import { createHash, timingSafeEqual } from "node:crypto";

/** Shorter secrets are refused: they could be guessed by trying the public job routes. */
export const CRON_SECRET_MIN_LENGTH = 32;

export type CronAuthorization =
  | { ok: true }
  | { ok: false; status: 401 | 503; message: string };

/**
 * Checks the `Authorization` header of a scheduled job request against CRON_SECRET (the scheduler
 * sends `Bearer <CRON_SECRET>`). Closed by default: without a valid secret configured, every
 * request is refused (503), so a forgotten variable never leaves the routes open.
 * The comparison runs on SHA-256 digests, in constant time and whatever the lengths.
 */
export function authorizeCronRequest(
  authorization: string | null,
  source: Record<string, string | undefined> = process.env,
): CronAuthorization {
  const secret = source.CRON_SECRET?.trim() ?? "";
  if (secret.length < CRON_SECRET_MIN_LENGTH) {
    return { ok: false, status: 503, message: "Tâches planifiées non configurées (CRON_SECRET)." };
  }

  const match = /^Bearer (.+)$/.exec(authorization ?? "");
  const given = match?.[1] ?? "";
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  if (!match || !timingSafeEqual(digest(given), digest(secret))) {
    return { ok: false, status: 401, message: "Non autorisé." };
  }
  return { ok: true };
}
