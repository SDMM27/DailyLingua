import { describe, expect, it } from "vitest";
import {
  cardKindSchema,
  cardSchema,
  cardStateSchema,
  cefrLevelSchema,
  cefrLevels,
  dateKeySchema,
  enrollmentSchema,
  languageCodeSchema,
  localizedTextSchema,
  profileSchema,
  reviewLogSchema,
  reviewRatingSchema,
  saveProfileInputSchema,
  skillEstimateSchema,
  skillSchema,
} from "./index";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const INSTANT = "2026-11-12T10:00:00+00:00";

describe("cefrLevelSchema", () => {
  it("accepts A1 to C2 and nothing else", () => {
    expect(cefrLevels).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
    for (const level of cefrLevels) expect(cefrLevelSchema.safeParse(level).success).toBe(true);
    for (const bad of ["A0", "c1", "D1", "", 1]) expect(cefrLevelSchema.safeParse(bad).success).toBe(false);
  });
});

describe("languageCodeSchema", () => {
  it("accepts 2 and 3 letter lowercase codes", () => {
    for (const code of ["fr", "ar", "fil", "yue"]) expect(languageCodeSchema.safeParse(code).success).toBe(true);
  });

  it("refuses other shapes", () => {
    for (const bad of ["f", "FR", "fr-FR", "fran", "f1", "", " fr"]) {
      expect(languageCodeSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("dateKeySchema", () => {
  it("accepts real calendar days", () => {
    expect(dateKeySchema.safeParse("2026-11-12").success).toBe(true);
    expect(dateKeySchema.safeParse("2028-02-29").success).toBe(true);
  });

  it("refuses impossible days and other formats", () => {
    for (const bad of ["2026-13-01", "2026-02-30", "2027-02-29", "12/11/2026", "2026-11-12T00:00:00Z", ""]) {
      expect(dateKeySchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("skillSchema", () => {
  it("lists the four skills", () => {
    for (const skill of ["reading", "listening", "writing", "speaking"]) {
      expect(skillSchema.safeParse(skill).success).toBe(true);
    }
    expect(skillSchema.safeParse("grammar").success).toBe(false);
  });
});

describe("card enums", () => {
  it("match the app schema", () => {
    expect(cardKindSchema.options).toEqual(["word", "chunk", "grammar", "script", "correction"]);
    expect(cardStateSchema.options).toEqual(["new", "learning", "review", "relearning", "suspended", "known"]);
  });

  it("bounds the review rating to 1..4 integers", () => {
    for (const rating of [1, 2, 3, 4]) expect(reviewRatingSchema.safeParse(rating).success).toBe(true);
    for (const bad of [0, 5, 2.5, "3", -1]) expect(reviewRatingSchema.safeParse(bad).success).toBe(false);
  });
});

describe("localizedTextSchema", () => {
  it("pairs a text with its language", () => {
    expect(localizedTextSchema.safeParse({ text: "Bonjour", lang: "fr" }).success).toBe(true);
    expect(localizedTextSchema.safeParse({ text: "Bonjour" }).success).toBe(false);
    expect(localizedTextSchema.safeParse({ text: "Bonjour", lang: "French" }).success).toBe(false);
  });
});

const profile = {
  userId: USER_ID,
  nativeLanguage: "fr",
  uiLanguage: "fr",
  timeZone: "Europe/Paris",
  reminderTime: "18:30",
  gameSettings: {},
  isGuest: false,
  legacyMigratedAt: null,
  createdAt: INSTANT,
  updatedAt: INSTANT,
};

describe("profileSchema", () => {
  it("accepts a valid profile, with any mother tongue", () => {
    expect(profileSchema.safeParse(profile).success).toBe(true);
    expect(profileSchema.safeParse({ ...profile, nativeLanguage: "yo", reminderTime: null }).success).toBe(true);
  });

  it("refuses a bad reminder time or language", () => {
    expect(profileSchema.safeParse({ ...profile, reminderTime: "25:00" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...profile, reminderTime: "18:30:00" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...profile, uiLanguage: "fr-FR" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...profile, userId: "not-a-uuid" }).success).toBe(false);
  });
});

const enrollment = {
  id: OTHER_ID,
  userId: USER_ID,
  language: "es",
  purpose: null,
  targetLevel: "B1",
  dailyMinutes: 15,
  days: [1, 2, 3, 4, 5, 6, 7],
  focus: {},
  position: 0,
  active: true,
  createdAt: INSTANT,
  updatedAt: INSTANT,
};

describe("enrollmentSchema", () => {
  it("accepts a valid enrollment", () => {
    expect(enrollmentSchema.safeParse(enrollment).success).toBe(true);
    expect(enrollmentSchema.safeParse({ ...enrollment, targetLevel: null, days: [6] }).success).toBe(true);
  });

  it("bounds the daily minutes to 5..120", () => {
    expect(enrollmentSchema.safeParse({ ...enrollment, dailyMinutes: 4 }).success).toBe(false);
    expect(enrollmentSchema.safeParse({ ...enrollment, dailyMinutes: 121 }).success).toBe(false);
    expect(enrollmentSchema.safeParse({ ...enrollment, dailyMinutes: 120 }).success).toBe(true);
  });

  it("refuses empty, duplicated or out-of-range weekdays", () => {
    for (const days of [[], [1, 1], [0], [8]]) {
      expect(enrollmentSchema.safeParse({ ...enrollment, days }).success).toBe(false);
    }
  });
});

const estimate = {
  userId: USER_ID,
  language: "es",
  skill: "reading",
  levelValue: 1.5,
  uncertainty: 0.5,
  source: "legacy",
  updatedAt: INSTANT,
};

describe("skillEstimateSchema", () => {
  it("accepts the whole 0..6 scale", () => {
    for (const levelValue of [0, 1.5, 6]) {
      expect(skillEstimateSchema.safeParse({ ...estimate, levelValue }).success).toBe(true);
    }
  });

  it("refuses out-of-scale values, a null uncertainty and unknown sources", () => {
    expect(skillEstimateSchema.safeParse({ ...estimate, levelValue: 6.1 }).success).toBe(false);
    expect(skillEstimateSchema.safeParse({ ...estimate, levelValue: -0.1 }).success).toBe(false);
    expect(skillEstimateSchema.safeParse({ ...estimate, uncertainty: 0 }).success).toBe(false);
    expect(skillEstimateSchema.safeParse({ ...estimate, source: "guess" }).success).toBe(false);
  });
});

const card = {
  id: OTHER_ID,
  userId: USER_ID,
  language: "es",
  kind: "word",
  ref: null,
  front: "casa",
  back: "maison",
  backLanguage: "fr",
  context: null,
  note: null,
  listId: null,
  state: "review",
  stability: 4,
  difficulty: 5,
  dueAt: INSTANT,
  lastReviewAt: INSTANT,
  reps: 3,
  lapses: 0,
  legacyBox: 2,
  source: "legacy",
  payload: {},
  createdAt: INSTANT,
  updatedAt: INSTANT,
};

describe("cardSchema", () => {
  it("accepts a reviewed card and a new card without memory state", () => {
    expect(cardSchema.safeParse(card).success).toBe(true);
    const fresh = { ...card, state: "new", stability: null, difficulty: null, lastReviewAt: null, reps: 0 };
    expect(cardSchema.safeParse(fresh).success).toBe(true);
  });

  it("refuses an empty front, a zero stability, a difficulty out of 1..10 and a bad kind", () => {
    expect(cardSchema.safeParse({ ...card, front: "" }).success).toBe(false);
    expect(cardSchema.safeParse({ ...card, stability: 0 }).success).toBe(false);
    expect(cardSchema.safeParse({ ...card, difficulty: 0.5 }).success).toBe(false);
    expect(cardSchema.safeParse({ ...card, difficulty: 10.5 }).success).toBe(false);
    expect(cardSchema.safeParse({ ...card, kind: "sentence" }).success).toBe(false);
    expect(cardSchema.safeParse({ ...card, dueAt: "2026-11-12" }).success).toBe(false);
  });
});

const log = {
  id: 1,
  userId: USER_ID,
  cardId: OTHER_ID,
  rating: 3,
  mode: null,
  reviewedAt: INSTANT,
  elapsedDays: 2,
  scheduledDays: 5,
  origin: "fsrs",
  clientEventId: null,
  createdAt: INSTANT,
};

describe("reviewLogSchema", () => {
  it("accepts both origins", () => {
    expect(reviewLogSchema.safeParse(log).success).toBe(true);
    expect(reviewLogSchema.safeParse({ ...log, origin: "leitner", elapsedDays: null }).success).toBe(true);
  });

  it("refuses a rating out of 1..4 and an unknown origin", () => {
    expect(reviewLogSchema.safeParse({ ...log, rating: 0 }).success).toBe(false);
    expect(reviewLogSchema.safeParse({ ...log, origin: "sm2" }).success).toBe(false);
  });
});

describe("saveProfileInputSchema", () => {
  const input = { nativeLanguage: "ar", uiLanguage: "en", timeZone: "Asia/Tokyo", reminderTime: null };

  it("accepts a null or HH:mm reminder", () => {
    expect(saveProfileInputSchema.safeParse(input).success).toBe(true);
    expect(saveProfileInputSchema.safeParse({ ...input, reminderTime: "07:05" }).success).toBe(true);
  });

  it("refuses a missing field and a malformed time", () => {
    expect(saveProfileInputSchema.safeParse({ ...input, timeZone: undefined }).success).toBe(false);
    expect(saveProfileInputSchema.safeParse({ ...input, reminderTime: "7:05" }).success).toBe(false);
  });
});
