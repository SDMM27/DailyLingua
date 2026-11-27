import type { DriftReport } from "@dailylingua/schemas";

/** Below this many active accounts the figures are indicative only. */
export const DRIFT_INDICATIVE_BELOW = 100;
const ALERT = "[ALERTE]";
const OK = "[ ok   ]";

const percent = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 1000) / 10} %` : "—");

/**
 * The "Dérives" section of the monthly report, one line per signal: marker, label, measure and threshold. The header says
 * "chiffres indicatifs" when fewer than 100 accounts are active. Pure: it only reads the aggregate.
 */
export function formatDriftReport(report: DriftReport): string[] {
  const line = (alert: boolean, label: string, measure: string, threshold: string) => `${alert ? ALERT : OK} ${label} : ${measure} (seuil : ${threshold})`;
  const [oldest, , , latest] = report.xpRetention.weeks;
  const recall = (week: { recallCount: number; recallTotal: number }) => percent(week.recallCount, week.recallTotal);
  const lines = [`Dérives — ${report.window.from} → ${report.window.through}`];
  if (report.activeAccounts < DRIFT_INDICATIVE_BELOW) lines.push(`Chiffres indicatifs : ${report.activeAccounts} comptes actifs (moins de ${DRIFT_INDICATIVE_BELOW}).`);
  lines.push(
    line(report.xpRetention.alert, "XP en hausse, rétention en baisse",
      `XP de la semaine ${oldest?.xp ?? 0} → ${latest?.xp ?? 0}, rappels réussis ${oldest ? recall(oldest) : "—"} → ${latest ? recall(latest) : "—"}`,
      "XP en hausse et rétention en baisse de 5 points ou plus"),
    line(report.midnight.alert, "Séances de minuit", `${report.midnight.flaggedDays} jours sur ${report.midnight.validatedDays} validés, ${report.midnight.accountsOver} compte(s) au-dessus de la moitié`,
      "plus de 50 % des jours validés d’un compte"),
    line(report.anxiousStreak.alert, "Série anxieuse", `${report.anxiousStreak.accounts} compte(s) avec 7 jours validés de suite sous 25 XP`, "au moins 1 compte"),
    line(report.easyQuests.alert, "Quêtes faciles", `${report.easyQuests.rerolled} relance(s) sur ${report.easyQuests.total} quêtes du jour (${percent(report.easyQuests.rerolled, report.easyQuests.total)})`,
      "relance au-dessus de 80 %"),
    `         part du volet ciblé sans hausse en 14 jours : non mesuré (${report.easyQuests.voletGainReason})`,
    line(report.compulsiveLeague.alert, "Ligue compulsive", `${report.compulsiveLeague.accounts} membre(s) au plafond de 150 XP 7 jours de suite`, "au moins 1 compte"),
    line(report.inflatedImmersion.alert, "Immersion gonflée", `${report.inflatedImmersion.accounts} compte(s) à plus de 4 h déclarées 5 jours de suite`, "au moins 1 compte"),
    line(report.switchedOff.alert, "Mécanique coupée",
      report.switchedOff.keys.length === 0 ? "aucune désactivation"
        : report.switchedOff.keys.map(({ key, accounts }) => `${key} ${accounts} (${percent(accounts, report.activeAccounts)})`).join(", "),
      "30 % des comptes actifs ou plus, pour une même clé"),
    line(report.notificationOptOut.alert, "Notifications", `${report.notificationOptOut.accounts} compte(s) ayant coupé les notifications dans les 24 h d’un envoi`, "au moins 1 compte"),
    line(report.challengeDeparture.alert, "Défis", `${report.challengeDeparture.accounts} compte(s) partis d’un défi puis deux fois moins actifs`, "au moins 1 compte"),
  );
  return lines;
}
