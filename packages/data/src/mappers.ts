import {
  enrollmentSchema,
  profileSchema,
  skillEstimateSchema,
  type Enrollment,
  type Profile,
  type EnrollmentInput,
  type SkillEstimate,
} from "@dailylingua/schemas";
import type { AppDatabase } from "./client";
import { DataError } from "./errors";

/** The only place where `snake_case` rows become `camelCase` domain objects. */

type Tables = AppDatabase["app"]["Tables"];
export type ProfileRow = Tables["profile"]["Row"];
export type EnrollmentRow = Tables["enrollment"]["Row"];
export type SkillEstimateRow = Tables["skill_estimate"]["Row"];

/** A row the schemas refuse means the database and the code disagree: a bug, never the user's fault. */
function validated<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new DataError("unknown");
  return result.data;
}

/** `time` columns come back as `HH:mm:ss`; the domain keeps the minute precision. */
function toTimeOfDay(value: string | null): string | null {
  return value === null ? null : value.slice(0, 5);
}

export function toProfile(row: ProfileRow): Profile {
  return validated(profileSchema, {
    userId: row.user_id,
    nativeLanguage: row.native_language,
    uiLanguage: row.ui_language,
    timeZone: row.time_zone,
    reminderTime: toTimeOfDay(row.reminder_time),
    gameSettings: row.game_settings,
    isGuest: row.is_guest,
    legacyMigratedAt: row.legacy_migrated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function toEnrollment(row: EnrollmentRow): Enrollment {
  return validated(enrollmentSchema, {
    id: row.id,
    userId: row.user_id,
    language: row.language,
    purpose: row.purpose,
    targetLevel: row.target_level,
    dailyMinutes: row.daily_minutes,
    days: row.days,
    focus: row.focus,
    position: row.position,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function toSkillEstimate(row: SkillEstimateRow): SkillEstimate {
  return validated(skillEstimateSchema, {
    userId: row.user_id,
    language: row.language,
    skill: row.skill,
    levelValue: row.level_value,
    uncertainty: row.uncertainty,
    source: row.source,
    updatedAt: row.updated_at,
  });
}

/** Wire form of one enrollment sent to `app.save_enrollments`. */
export type EnrollmentPayload = {
  language: string;
  daily_minutes: number;
  days: number[];
  target_level: string | null;
  purpose: string | null;
  start_level: string | null;
};

/** Parsed input (defaults applied) to the JSON array of `app.save_enrollments`; order is the position. */
export function toEnrollmentsPayload(input: readonly EnrollmentInput[]): EnrollmentPayload[] {
  return input.map((item) => ({
    language: item.language,
    daily_minutes: item.dailyMinutes,
    days: item.days,
    target_level: item.targetLevel,
    purpose: item.purpose,
    start_level: item.startLevel,
  }));
}
