import { describe, expect, it } from "vitest";
import { z } from "zod";
import { missionHistoryEntrySchema, missionSchema } from "@/lib/schemas/mission";
import { preferencesSchema } from "@/lib/schemas/preferences";
import { vocabularyItemSchema } from "@/lib/schemas/vocabulary";
import { buildMockHistory } from "./history";
import { buildMockMission } from "./mission";
import { MOCK_PREFERENCES } from "./preferences";
import { buildMockVocabulary } from "./vocabulary";

const TODAY = "2026-10-13";

describe("demo data matches the schemas", () => {
  it("mission", () => {
    expect(() => missionSchema.parse(buildMockMission(TODAY))).not.toThrow();
  });

  it("history", () => {
    expect(() => z.array(missionHistoryEntrySchema).parse(buildMockHistory(TODAY))).not.toThrow();
  });

  it("vocabulary", () => {
    expect(() => z.array(vocabularyItemSchema).parse(buildMockVocabulary(TODAY))).not.toThrow();
  });

  it("preferences", () => {
    expect(() => preferencesSchema.parse(MOCK_PREFERENCES)).not.toThrow();
  });
});

describe("schemas reject invalid data", () => {
  it("a question whose answer index is out of range", () => {
    const mission = buildMockMission(TODAY);
    mission.sessions[0].questions[0].answerIndex = 9;
    expect(missionSchema.safeParse(mission).success).toBe(false);
  });

  it("a malformed generation time", () => {
    expect(preferencesSchema.safeParse({ ...MOCK_PREFERENCES, generationTime: "7h" }).success).toBe(false);
  });

  it("an empty topic list", () => {
    expect(preferencesSchema.safeParse({ ...MOCK_PREFERENCES, topics: [] }).success).toBe(false);
  });
});

describe("demo mission content", () => {
  it("has unique activity ids", () => {
    const ids = buildMockMission(TODAY).sessions.flatMap((s) => s.activities.map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no quiz when no transcript was available (fallback mode)", () => {
    for (const session of buildMockMission(TODAY).sessions) {
      if (!session.content.transcriptAvailable) expect(session.questions).toHaveLength(0);
    }
  });
});

describe("preferences accept any number of distinct languages", () => {
  it("accepts three languages", () => {
    const goals = [
      ...MOCK_PREFERENCES.goals,
      { language: "es" as const, level: "A2" as const, targetLevel: "B1" as const, focus: "", weight: 1 },
    ];
    expect(preferencesSchema.safeParse({ ...MOCK_PREFERENCES, goals }).success).toBe(true);
  });

  it("rejects the same language twice", () => {
    const goals = [MOCK_PREFERENCES.goals[0], MOCK_PREFERENCES.goals[0]];
    expect(preferencesSchema.safeParse({ ...MOCK_PREFERENCES, goals }).success).toBe(false);
  });

  it("rejects an unknown language code", () => {
    const goals = [{ ...MOCK_PREFERENCES.goals[0], language: "xx" }];
    expect(preferencesSchema.safeParse({ ...MOCK_PREFERENCES, goals }).success).toBe(false);
  });
});
