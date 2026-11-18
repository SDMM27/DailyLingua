import { z } from "zod";
import { timeOfDaySchema } from "../common";

/**
 * `profile.game_settings` (`j2-jeu-xp-serie.md` §8): a closed schema, every key optional (an absent key
 * has its default, resolved by `resolveGameSettings` in `@dailylingua/core`). The JSON is nested
 * (`{ ring: { tier: 20 } }`); the history table `setting_change` uses the dotted key (`ring.tier`).
 */
export const ringTiers = [10, 15, 20, 30] as const;
export const ringTierSchema = z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(30)]);
export type RingTier = z.infer<typeof ringTierSchema>;

export const streakModes = ["daily", "weekly"] as const;
export const streakModeSchema = z.enum(streakModes);
export type StreakMode = z.infer<typeof streakModeSchema>;

export const gameSettingsSchema = z.strictObject({
  xpVisible: z.boolean().optional(),
  ring: z.strictObject({ enabled: z.boolean().optional(), tier: ringTierSchema.optional() }).optional(),
  streak: z
    .strictObject({
      enabled: z.boolean().optional(),
      mode: streakModeSchema.optional(),
      weeklyTarget: z.number().int().min(2).max(7).optional(),
      /** ISO weekdays, 1 = Monday … 7 = Sunday; at most two, no duplicate. */
      restDays: z
        .array(z.number().int().min(1).max(7))
        .max(2)
        .refine((days) => new Set(days).size === days.length, "Duplicate weekday")
        .optional(),
    })
    .optional(),
  celebrations: z.enum(["full", "reduced"]).optional(),
  sound: z.strictObject({ enabled: z.boolean().optional(), volume: z.number().int().min(1).max(3).optional() }).optional(),
  haptics: z.boolean().optional(),
  notifications: z
    .strictObject({ enabled: z.boolean().optional(), time: timeOfDaySchema.optional(), weeklySummary: z.boolean().optional() })
    .optional(),
  answerTolerance: z.strictObject({ accents: z.enum(["strict", "lenient"]).optional() }).optional(),
});
export type GameSettings = z.infer<typeof gameSettingsSchema>;

/** The closed list of dotted keys, as `setting_change.key` and `save_game_settings` know them. */
export const gameSettingKeys = [
  "xpVisible",
  "ring.enabled",
  "ring.tier",
  "streak.enabled",
  "streak.mode",
  "streak.weeklyTarget",
  "streak.restDays",
  "celebrations",
  "sound.enabled",
  "sound.volume",
  "haptics",
  "notifications.enabled",
  "notifications.time",
  "notifications.weeklySummary",
  "answerTolerance.accents",
] as const;
export type GameSettingKey = (typeof gameSettingKeys)[number];

/** `{ ring: { tier: 20 } }` → `{ "ring.tier": 20 }`: only the keys that are present. */
export function flattenGameSettings(settings: GameSettings): Partial<Record<GameSettingKey, unknown>> {
  const flat: Partial<Record<GameSettingKey, unknown>> = {};
  for (const key of gameSettingKeys) {
    const [head, tail] = key.split(".") as [string, string | undefined];
    const group = (settings as Record<string, unknown>)[head];
    const value = tail === undefined ? group : group !== null && typeof group === "object" ? (group as Record<string, unknown>)[tail] : undefined;
    if (value !== undefined) flat[key] = value;
  }
  return flat;
}
