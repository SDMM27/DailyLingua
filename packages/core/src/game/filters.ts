import type { DateKey, IngestXpLine } from "@dailylingua/schemas";

/** An XP line as the filters see it: a row of `xp_ledger` in the shape of the core (camelCase). */
export interface XpLine {
  reason: string;
  amount: number;
  /** Day the line is written on (`xp_ledger.day`). */
  day: DateKey;
  leagueEligible: boolean;
  /** Written for an event received more than 72 hours late: out of the ring, the week and the streak. */
  late: boolean;
}

/** The camelCase form of a line of the ingest payload. */
export function xpLineFromIngest(line: IngestXpLine): XpLine {
  return {
    reason: line.reason,
    amount: line.amount,
    day: line.day,
    leagueEligible: line.league_eligible,
    late: line.meta.late === true,
  };
}

/**
 * The three named filters of `j2-jeu-xp-serie.md` §2.4. Future rule families (`quest.*`, `immersion.*`,
 * `speech.minute`…) join them by name without touching these functions.
 *
 * - ring: every rule except `immersion.*`, late lines out;
 * - streak: every rule except `quest.*` and `immersion.*`, late lines out;
 * - league: `league_eligible` lines except `immersion.*`, at most 150 XP a day.
 */
export const LEAGUE_DAILY_CAP = 150;

const startsWith = (reason: string, prefix: string) => reason.startsWith(prefix);

export function countsForRing(line: XpLine): boolean {
  return !line.late && !startsWith(line.reason, "immersion.");
}

export function countsForStreak(line: XpLine): boolean {
  return !line.late && !startsWith(line.reason, "quest.") && !startsWith(line.reason, "immersion.");
}

export function countsForLeague(line: XpLine): boolean {
  return line.leagueEligible && !startsWith(line.reason, "immersion.");
}

const sum = (lines: readonly XpLine[], keep: (line: XpLine) => boolean) => lines.reduce((total, line) => (keep(line) ? total + line.amount : total), 0);

/** XP that fills the ring: the lines handed in are those of the day. */
export function ringXp(lines: readonly XpLine[]): number {
  return sum(lines, countsForRing);
}

/** XP that validates the day of the streak (threshold 20). */
export function streakXp(lines: readonly XpLine[]): number {
  return sum(lines, countsForStreak);
}

/** XP of the league for the day, capped at 150. */
export function leagueXp(lines: readonly XpLine[]): number {
  return Math.min(LEAGUE_DAILY_CAP, sum(lines, countsForLeague));
}

/** Lines grouped by their `day`, keys in ascending order. */
export function groupByDay(lines: readonly XpLine[]): Map<DateKey, XpLine[]> {
  const groups = new Map<DateKey, XpLine[]>();
  for (const line of [...lines].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))) {
    const group = groups.get(line.day);
    if (group) group.push(line);
    else groups.set(line.day, [line]);
  }
  return groups;
}

/** XP of a day that validates it for the streak (`streakXp >= 20`, `j2-jeu-xp-serie.md` §4.1). */
export const STREAK_VALIDATION_XP = 20;
