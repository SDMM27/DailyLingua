import { describe, expect, it } from "vitest";
import {
  LEAGUE_DAILY_CAP,
  RING_TIER_XP,
  buildSettingsHistory,
  countsForLeague,
  countsForRing,
  countsForStreak,
  defaultRingTier,
  diffGameSettings,
  effectiveDayOf,
  groupByDay,
  leagueXp,
  lowerGoalProposal,
  nextMonday,
  resolveGameSettings,
  ringFill,
  ringGoalXp,
  ringXp,
  streakXp,
  weekProgress,
  weekStart,
  weeklyGoalXp,
  xpLineFromIngest,
  type XpLine,
} from "./index";

const line = (reason: string, amount: number, extra: Partial<XpLine> = {}): XpLine => ({ reason, amount, day: "2026-11-12", leagueEligible: true, late: false, ...extra });

describe("XP filters", () => {
  const lines = [
    line("review.recognition", 10),
    line("reading.understood", 15),
    line("quest.daily", 30),
    line("immersion.declared", 20),
    line("focus.first_try", 6, { late: true }),
    line("session.complete", 10, { leagueEligible: false }),
  ];

  it("ringXp: every rule but immersion, late lines out", () => {
    expect(ringXp(lines)).toBe(10 + 15 + 30 + 10);
    expect(countsForRing(line("immersion.declared", 1))).toBe(false);
    expect(countsForRing(line("quest.daily", 1))).toBe(true);
  });

  it("streakXp: every rule but quest and immersion, late lines out", () => {
    expect(streakXp(lines)).toBe(10 + 15 + 10);
    expect(countsForStreak(line("quest.weekly", 1))).toBe(false);
  });

  it("leagueXp: league_eligible lines, not immersion, at most 150 a day", () => {
    expect(leagueXp(lines)).toBe(10 + 15 + 30 + 6);
    expect(leagueXp([line("review.production", 100), line("reading.understood", 100)])).toBe(LEAGUE_DAILY_CAP);
    expect(countsForLeague(line("review.production", 1, { leagueEligible: false }))).toBe(false);
  });

  it("converts a line of the ingest payload and groups by day", () => {
    const converted = xpLineFromIngest({ source: null, language: "it", day: "2026-11-10", amount: 3, reason: "focus.first_try", rule_version: "j2.1", league_eligible: true, meta: { late: true } });
    expect(converted).toEqual({ reason: "focus.first_try", amount: 3, day: "2026-11-10", leagueEligible: true, late: true });
    const groups = groupByDay([line("a", 1, { day: "2026-11-12" }), line("b", 1, { day: "2026-11-10" }), line("c", 1, { day: "2026-11-12" })]);
    expect([...groups.keys()]).toEqual(["2026-11-10", "2026-11-12"]);
    expect(groups.get("2026-11-12")).toHaveLength(2);
  });
});

describe("ring", () => {
  it("has the four tiers of the scale; the 45 minute tier is not open", () => {
    expect(RING_TIER_XP).toEqual({ 10: 50, 15: 75, 20: 100, 30: 150 });
    expect(ringGoalXp(15)).toBe(75);
    expect(weeklyGoalXp(15)).toBe(375);
    expect(weeklyGoalXp(30)).toBe(750);
  });

  it("fills up to 100 %, never beyond", () => {
    expect(ringFill(0, 15)).toMatchObject({ ratio: 0, percent: 0, complete: false });
    expect(ringFill(30, 15)).toMatchObject({ ratio: 0.4, percent: 40, complete: false });
    expect(ringFill(75, 15)).toMatchObject({ ratio: 1, percent: 100, complete: true });
    expect(ringFill(130, 15)).toMatchObject({ ratio: 1, percent: 100, complete: true });
  });

  it("uses the session duration as the default tier", () => {
    expect(defaultRingTier(10)).toBe(10);
    expect(defaultRingTier(15)).toBe(15);
    expect(defaultRingTier(20)).toBe(20);
    expect(defaultRingTier(30)).toBe(30);
  });

  it("measures a week from Monday against five days of the tier", () => {
    expect(weekStart("2026-11-12")).toBe("2026-11-09");
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
    expect(weekStart("2026-11-15")).toBe("2026-11-09");
    const xp: Record<string, number> = { "2026-11-09": 80, "2026-11-10": 75, "2026-11-11": 100, "2026-11-12": 70, "2026-11-13": 50 };
    const progress = weekProgress({ monday: "2026-11-09", tier: 15, ringEnabled: true, xpByDay: (day) => xp[day] ?? 0 });
    expect(progress).toMatchObject({ xp: 375, goal: 375, met: true });
    expect(progress.ringCompleteDays).toEqual(["2026-11-09", "2026-11-10", "2026-11-11"]);
    expect(weekProgress({ monday: "2026-11-09", tier: 15, ringEnabled: true, xpByDay: (day) => (xp[day] ?? 0) - (day === "2026-11-13" ? 1 : 0) }).met).toBe(false);
  });

  it("never meets the weekly goal with the ring off", () => {
    expect(weekProgress({ monday: "2026-11-09", tier: 10, ringEnabled: false, xpByDay: () => 500 }).met).toBe(false);
  });
});

describe("lowerGoalProposal", () => {
  const days = (xp: number[], tier: 15 | 10 | 20 | 30 = 15, rest: number[] = []) =>
    xp.map((value, i) => ({ day: `2026-11-${String(i + 1).padStart(2, "0")}`, xp: value, tier, rest: rest.includes(i) }));
  const quiet = [40, 0, 30, 0, 50, 0, 40, 0, 35, 0, 45, 0, 0, 40];

  it("is offered once when no ring was completed in 14 days and 4 days or more had XP", () => {
    expect(lowerGoalProposal({ days: days(quiet), alreadyProposed: false })).toEqual({ propose: true, toTier: 10, typicalXp: 40 });
    expect(lowerGoalProposal({ days: days(quiet), alreadyProposed: true })).toEqual({ propose: false });
  });

  it("is not offered when a ring was completed, when the days are too few, or at the lowest tier", () => {
    expect(lowerGoalProposal({ days: days([...quiet.slice(0, 13), 75]), alreadyProposed: false }).propose).toBe(false);
    expect(lowerGoalProposal({ days: days([40, 40, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), alreadyProposed: false }).propose).toBe(false);
    expect(lowerGoalProposal({ days: days(quiet, 10), alreadyProposed: false }).propose).toBe(false);
    expect(lowerGoalProposal({ days: days(quiet.slice(0, 10)), alreadyProposed: false }).propose).toBe(false);
  });

  it("proposes the tier just below and excludes rest days", () => {
    expect(lowerGoalProposal({ days: days(quiet, 30), alreadyProposed: false })).toMatchObject({ propose: true, toTier: 20 });
    // Four active days only, but two of them are rest days: they do not count.
    expect(lowerGoalProposal({ days: days([40, 40, 40, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 15, [0, 1]), alreadyProposed: false }).propose).toBe(false);
  });

  it("is not offered when the tier changed in the period", () => {
    const mixed = days(quiet).map((entry, i) => (i === 3 ? { ...entry, tier: 20 as const } : entry));
    expect(lowerGoalProposal({ days: mixed, alreadyProposed: false }).propose).toBe(false);
  });
});

describe("game settings", () => {
  it("fills the defaults of the table", () => {
    expect(resolveGameSettings(undefined)).toEqual({
      xpVisible: true,
      ring: { enabled: true, tier: 15 },
      streak: { enabled: true, mode: "daily", weeklyTarget: 4, restDays: [] },
      celebrations: "full",
      sound: { enabled: false, volume: 2 },
      haptics: false,
      notifications: { enabled: false, time: "19:00", weeklySummary: true },
      answerTolerance: { accents: "lenient" },
      quests: { enabled: true },
      immersionXp: { enabled: true },
      badges: { enabled: true },
      league: { enabled: false },
      friends: { enabled: false },
    });
    expect(resolveGameSettings({ ring: { tier: 30 } }, 10).ring).toEqual({ enabled: true, tier: 30 });
    expect(resolveGameSettings({}, 10).ring.tier).toBe(10);
  });

  it("takes effect tomorrow, or next Monday for the streak mode and target", () => {
    expect(effectiveDayOf("ring.tier", "2026-11-12")).toBe("2026-11-13");
    expect(effectiveDayOf("streak.restDays", "2026-11-12")).toBe("2026-11-13");
    expect(effectiveDayOf("streak.mode", "2026-11-12")).toBe("2026-11-16");
    expect(effectiveDayOf("streak.weeklyTarget", "2026-11-16")).toBe("2026-11-23");
    expect(nextMonday("2026-11-15")).toBe("2026-11-16");
  });

  it("writes one change per key that differs, dated by its effective day", () => {
    const changes = diffGameSettings(
      { ring: { tier: 15 }, sound: { enabled: true } },
      { ring: { tier: 20 }, streak: { mode: "weekly" }, sound: { enabled: true } },
      { today: "2026-11-12", changedAt: "2026-11-12T10:00:00.000Z" },
    );
    expect(changes).toEqual([
      { key: "ring.tier", value: 20, effectiveDay: "2026-11-13", changedAt: "2026-11-12T10:00:00.000Z" },
      { key: "streak.mode", value: "weekly", effectiveDay: "2026-11-16", changedAt: "2026-11-12T10:00:00.000Z" },
    ]);
    expect(diffGameSettings({ haptics: true }, { haptics: true }, { today: "2026-11-12", changedAt: "x" })).toEqual([]);
  });

  it("reads the history: the latest change effective by the day wins, ties go to the latest write", () => {
    const history = buildSettingsHistory(
      [
        { key: "ring.tier", value: 20, effectiveDay: "2026-11-10", changedAt: "2026-11-09T10:00:00Z" },
        { key: "ring.tier", value: 30, effectiveDay: "2026-11-10", changedAt: "2026-11-09T11:00:00Z" },
        { key: "ring.tier", value: 10, effectiveDay: "2026-11-14", changedAt: "2026-11-13T10:00:00Z" },
        { key: "streak.restDays", value: [6, 7], effectiveDay: "2026-11-10", changedAt: "2026-11-09T10:00:00Z" },
        { key: "streak.enabled", value: false, effectiveDay: "2026-11-11", changedAt: "2026-11-10T10:00:00Z" },
      ],
      15,
    );
    expect(history.tierAt("2026-11-09")).toBe(15);
    expect(history.tierAt("2026-11-10")).toBe(30);
    expect(history.tierAt("2026-11-14")).toBe(10);
    expect(history.isRestDay("2026-11-14")).toBe(true); // Saturday
    expect(history.isRestDay("2026-11-13")).toBe(false);
    expect(history.isRestDay("2026-11-07")).toBe(false); // Saturday before the change
    expect(history.enabledAt("2026-11-10")).toBe(true);
    expect(history.enabledAt("2026-11-11")).toBe(false);
    expect(history.modeAt("2026-11-11")).toBe("daily");
    expect(history.weeklyTargetAt("2026-11-11")).toBe(4);
    expect(history.ringEnabledAt("2026-11-11")).toBe(true);
  });
});
