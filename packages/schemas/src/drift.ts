import { z } from "zod";

/** The aggregate answer of `app.drift_report` (`j7-social.md` lot 4): counts and shares only, never an account id. */
const alertFlag = z.boolean();
const count = z.number().int().nonnegative();

export const driftReportSchema = z.object({
  window: z.object({ from: z.string(), through: z.string() }),
  activeAccounts: count,
  /** Four weeks ending on `through`, oldest first. */
  xpRetention: z.object({
    weeks: z.array(z.object({ xp: count, recallCount: count, recallTotal: count })).length(4),
    alert: alertFlag,
  }),
  midnight: z.object({ validatedDays: count, flaggedDays: count, accountsOver: count, alert: alertFlag }),
  anxiousStreak: z.object({ accounts: count, alert: alertFlag }),
  easyQuests: z.object({ rerolled: count, total: count, alert: alertFlag, voletGain: z.null(), voletGainReason: z.string() }),
  compulsiveLeague: z.object({ accounts: count, alert: alertFlag }),
  inflatedImmersion: z.object({ accounts: count, alert: alertFlag }),
  switchedOff: z.object({ keys: z.array(z.object({ key: z.string(), accounts: count })), alert: alertFlag }),
  notificationOptOut: z.object({ accounts: count, alert: alertFlag }),
  challengeDeparture: z.object({ accounts: count, alert: alertFlag }),
});
export type DriftReport = z.infer<typeof driftReportSchema>;
