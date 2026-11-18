import type { RingTier, SessionFormat } from "@dailylingua/schemas";

const FORMATS: readonly SessionFormat[] = [10, 15, 20, 30];

/** The session format nearest to the minutes an enrollment asks for a day (a tie goes to the shorter one). */
export function formatOfMinutes(dailyMinutes: number | null | undefined): SessionFormat {
  if (typeof dailyMinutes !== "number" || !Number.isFinite(dailyMinutes)) return 15;
  let best: SessionFormat = 15;
  let distance = Number.POSITIVE_INFINITY;
  for (const format of FORMATS) {
    const d = Math.abs(format - dailyMinutes);
    if (d < distance) {
      best = format;
      distance = d;
    }
  }
  return best;
}

/** The ring tier a learner has by default: the duration of their session. */
export function ringTierOfMinutes(dailyMinutes: number | null | undefined): RingTier {
  return formatOfMinutes(dailyMinutes);
}
