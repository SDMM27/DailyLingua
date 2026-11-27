import { flattenGameSettings, type DateKey, type GameSettingKey, type GameSettings, type RingTier, type StreakMode } from "@dailylingua/schemas";
import { addDays, isoWeekday } from "../dates";

/** `profile.game_settings` with its defaults filled in (`j2-jeu-xp-serie.md` §8). */
export interface ResolvedGameSettings {
  xpVisible: boolean;
  ring: { enabled: boolean; tier: RingTier };
  streak: { enabled: boolean; mode: StreakMode; weeklyTarget: number; restDays: number[] };
  celebrations: "full" | "reduced";
  sound: { enabled: boolean; volume: number };
  haptics: boolean;
  notifications: { enabled: boolean; time: string; weeklySummary: boolean };
  answerTolerance: { accents: "strict" | "lenient" };
  quests: { enabled: boolean };
  immersionXp: { enabled: boolean };
  badges: { enabled: boolean };
  league: { enabled: boolean };
  friends: { enabled: boolean };
}

export const DEFAULT_WEEKLY_TARGET = 4;

/** Session format → ring tier: the default tier is the duration of the session (`j2-jeu-xp-serie.md` §5). */
export function defaultRingTier(sessionFormat: number): RingTier {
  return sessionFormat === 10 || sessionFormat === 20 || sessionFormat === 30 ? sessionFormat : 15;
}

/** Defaults of every key; the ring tier follows the session format (15 minutes unless given). */
export function resolveGameSettings(stored: GameSettings | null | undefined, sessionFormat = 15): ResolvedGameSettings {
  const s = stored ?? {};
  return {
    xpVisible: s.xpVisible ?? true,
    ring: { enabled: s.ring?.enabled ?? true, tier: s.ring?.tier ?? defaultRingTier(sessionFormat) },
    streak: {
      enabled: s.streak?.enabled ?? true,
      mode: s.streak?.mode ?? "daily",
      weeklyTarget: s.streak?.weeklyTarget ?? DEFAULT_WEEKLY_TARGET,
      restDays: [...(s.streak?.restDays ?? [])].sort((a, b) => a - b),
    },
    celebrations: s.celebrations ?? "full",
    sound: { enabled: s.sound?.enabled ?? false, volume: s.sound?.volume ?? 2 },
    haptics: s.haptics ?? false,
    notifications: { enabled: s.notifications?.enabled ?? false, time: s.notifications?.time ?? "19:00", weeklySummary: s.notifications?.weeklySummary ?? true },
    answerTolerance: { accents: s.answerTolerance?.accents ?? "lenient" },
    quests: { enabled: s.quests?.enabled ?? true },
    immersionXp: { enabled: s.immersionXp?.enabled ?? true },
    badges: { enabled: s.badges?.enabled ?? true },
    league: { enabled: s.league?.enabled ?? false },
    friends: { enabled: s.friends?.enabled ?? false },
  };
}

/** One row of `setting_change` (append only): the value of `key` applies from `effectiveDay` on. */
export interface SettingChange {
  key: GameSettingKey;
  value: unknown;
  effectiveDay: DateKey;
  /** ISO 8601 instant; breaks ties between two changes with the same effective day (the later wins). */
  changedAt: string;
}

/** Keys whose change takes effect on the next Monday (04:00) instead of tomorrow. */
const MONDAY_KEYS: readonly GameSettingKey[] = ["streak.mode", "streak.weeklyTarget"];

/** The first Monday strictly after `day`. */
export function nextMonday(day: DateKey): DateKey {
  return addDays(day, 8 - isoWeekday(day));
}

/** Day from which a change made on learning day `today` applies: tomorrow, or the next Monday for the streak mode and target. */
export function effectiveDayOf(key: GameSettingKey, today: DateKey): DateKey {
  return MONDAY_KEYS.includes(key) ? nextMonday(today) : addDays(today, 1);
}

/**
 * The `setting_change` rows a save writes: one per key whose value differs from the stored one. Both sides
 * are the resolved settings, so a key moved back to its default is a change too.
 */
export function diffGameSettings(
  before: GameSettings | null | undefined,
  after: GameSettings,
  ctx: { today: DateKey; changedAt: string },
  sessionFormat = 15,
): SettingChange[] {
  const previous = flattenGameSettings(resolveGameSettings(before, sessionFormat) as unknown as GameSettings);
  const next = flattenGameSettings(resolveGameSettings(mergeSettings(before, after), sessionFormat) as unknown as GameSettings);
  const changes: SettingChange[] = [];
  for (const key of Object.keys(next) as GameSettingKey[]) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(next[key])) {
      changes.push({ key, value: next[key], effectiveDay: effectiveDayOf(key, ctx.today), changedAt: ctx.changedAt });
    }
  }
  return changes;
}

/** `after` laid over `before`, group by group. */
export function mergeSettings(before: GameSettings | null | undefined, after: GameSettings): GameSettings {
  const base = (before ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(after)) {
    merged[key] = value !== null && typeof value === "object" && !Array.isArray(value) ? { ...(base[key] as object | undefined), ...value } : value;
  }
  return merged as GameSettings;
}

/** The settings in force on a given day, read from the append-only history. Pure. */
export interface SettingsHistory {
  ringEnabledAt(day: DateKey): boolean;
  tierAt(day: DateKey): RingTier;
  enabledAt(day: DateKey): boolean;
  modeAt(day: DateKey): StreakMode;
  weeklyTargetAt(day: DateKey): number;
  isRestDay(day: DateKey): boolean;
}

/** Builds the history reader: the latest change effective on or before the day wins, ties by `changedAt`, then by order. */
export function buildSettingsHistory(changes: readonly SettingChange[], defaultTier: RingTier = 15): SettingsHistory {
  const indexed = changes.map((change, index) => ({ change, index }));
  const valueAt = <T>(key: GameSettingKey, day: DateKey, fallback: T): T => {
    let best: { change: SettingChange; index: number } | null = null;
    for (const entry of indexed) {
      if (entry.change.key !== key || entry.change.effectiveDay > day) continue;
      if (
        best === null ||
        entry.change.effectiveDay > best.change.effectiveDay ||
        (entry.change.effectiveDay === best.change.effectiveDay &&
          (entry.change.changedAt > best.change.changedAt || (entry.change.changedAt === best.change.changedAt && entry.index > best.index)))
      ) {
        best = entry;
      }
    }
    return best ? (best.change.value as T) : fallback;
  };
  return {
    ringEnabledAt: (day) => valueAt("ring.enabled", day, true),
    tierAt: (day) => valueAt<RingTier>("ring.tier", day, defaultTier),
    enabledAt: (day) => valueAt("streak.enabled", day, true),
    modeAt: (day) => valueAt<StreakMode>("streak.mode", day, "daily"),
    weeklyTargetAt: (day) => valueAt("streak.weeklyTarget", day, DEFAULT_WEEKLY_TARGET),
    isRestDay: (day) => valueAt<number[]>("streak.restDays", day, []).includes(isoWeekday(day)),
  };
}
