import { driftReportSchema, type DriftReport } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { formatDriftReport } from "./drift";

const quiet = {
  window: { from: "2026-11-01", through: "2026-11-28" },
  activeAccounts: 12,
  xpRetention: { weeks: [{ xp: 400, recallCount: 80, recallTotal: 100 }, { xp: 410, recallCount: 80, recallTotal: 100 }, { xp: 420, recallCount: 80, recallTotal: 100 }, { xp: 380, recallCount: 80, recallTotal: 100 }], alert: false },
  midnight: { validatedDays: 40, flaggedDays: 2, accountsOver: 0, alert: false },
  anxiousStreak: { accounts: 0, alert: false },
  easyQuests: { rerolled: 3, total: 40, alert: false, voletGain: null, voletGainReason: "not kept" },
  compulsiveLeague: { accounts: 0, alert: false },
  inflatedImmersion: { accounts: 0, alert: false },
  switchedOff: { keys: [], alert: false },
  notificationOptOut: { accounts: 0, alert: false },
  challengeDeparture: { accounts: 0, alert: false },
} satisfies DriftReport;

describe("driftReportSchema", () => {
  it("accepts the aggregate and refuses anything that looks like an account row", () => {
    expect(driftReportSchema.safeParse(quiet).success).toBe(true);
    expect(driftReportSchema.safeParse({ ...quiet, midnight: { ...quiet.midnight, accountsOver: -1 } }).success).toBe(false);
    expect(driftReportSchema.safeParse({ ...quiet, xpRetention: { ...quiet.xpRetention, weeks: [] } }).success).toBe(false);
    expect(driftReportSchema.safeParse({ ...quiet, activeAccounts: "12" }).success).toBe(false);
  });
});

describe("formatDriftReport", () => {
  it("says the figures are indicative below 100 active accounts, and not from 100 on", () => {
    expect(formatDriftReport(quiet)[1]).toContain("Chiffres indicatifs : 12 comptes actifs");
    expect(formatDriftReport({ ...quiet, activeAccounts: 100 }).join("\n")).not.toContain("indicatifs");
  });

  it("writes one line per signal with its threshold and marks the alerts", () => {
    const lines = formatDriftReport({
      ...quiet,
      anxiousStreak: { accounts: 2, alert: true },
      switchedOff: { keys: [{ key: "quests.enabled", accounts: 4 }], alert: true },
    });
    expect(lines.filter((line) => line.startsWith("[ALERTE]"))).toHaveLength(2);
    expect(lines.filter((line) => line.startsWith("[ ok   ]"))).toHaveLength(7);
    expect(lines.find((line) => line.includes("Série anxieuse"))).toBe("[ALERTE] Série anxieuse : 2 compte(s) avec 7 jours validés de suite sous 25 XP (seuil : au moins 1 compte)");
    expect(lines.find((line) => line.includes("Mécanique coupée"))).toContain("quests.enabled 4 (33.3 %)");
  });

  it("states what is not measured and never prints more than aggregates", () => {
    const text = formatDriftReport(quiet).join("\n");
    expect(text).toContain("non mesuré (not kept)");
    expect(text).toContain("XP de la semaine 400 → 380, rappels réussis 80 % → 80 %");
    expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });
});
