import type { EnrollmentRow, ProfileRow, SkillEstimateRow } from "./mappers";

/** Database rows shared by the unit tests. */
export const USER_ID = "11111111-1111-4111-8111-111111111111";
export const INSTANT = "2026-11-12T10:00:00.123456+00:00";

export const profileRow: ProfileRow = {
  user_id: USER_ID,
  native_language: "ar",
  ui_language: "en",
  time_zone: "Asia/Tokyo",
  reminder_time: "08:15:00",
  game_settings: { sounds: false },
  is_guest: false,
  legacy_migrated_at: null,
  app_active_since: null,
  created_at: INSTANT,
  updated_at: INSTANT,
};

export const enrollmentRow: EnrollmentRow = {
  id: "22222222-2222-4222-8222-222222222222",
  user_id: USER_ID,
  language: "fr",
  purpose: null,
  target_level: "B1",
  daily_minutes: 20,
  days: [1, 3, 5],
  focus: {},
  position: 0,
  active: true,
  created_at: INSTANT,
  updated_at: INSTANT,
};

export const estimateRow: SkillEstimateRow = {
  user_id: USER_ID,
  language: "fr",
  skill: "reading",
  level_value: 0.5,
  uncertainty: 1,
  source: "declared",
  updated_at: INSTANT,
};
