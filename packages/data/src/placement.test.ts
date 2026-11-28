import { describe, expect, it } from "vitest";
import { hasPlacementOnVersion, recordPlacementResult, type PlacementResultInput } from "./placement";
import { tableFake } from "./table-fake";

const user = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";

const input: PlacementResultInput = {
  language: "ru",
  startLevel: "A2",
  estimatedLevel: "B1",
  confidence: "medium",
  chosenLevel: "B2",
  answers: [{ itemId: "ru-a2-1", choice: 2, correct: true }, { itemId: "ru-a2-2", choice: null, correct: false }],
  bankVersion: "2026-11-27",
  takenAt: "2026-11-28T10:00:00.000Z",
  reading: { levelValue: 4.5, uncertainty: 0.75 },
};

describe("recordPlacementResult", () => {
  it("adds a placement result in the shape placement:calibrate reads, for the learner only", async () => {
    const { client, queries } = tableFake({ assessment_result: [], skill_estimate: [] });
    await recordPlacementResult(client, user, input);
    const stored = await client.schema("app").from("assessment_result").select("*");
    expect(stored.data).toEqual([expect.objectContaining({
      user_id: user, language: "ru", kind: "placement", taken_at: "2026-11-28T10:00:00.000Z",
      levels: { reception: "B2", estimated: "B1", start: "A2" },
      payload: {
        status: "completed", bank_version: "2026-11-27", start_level: "A2", estimated_level: "B1", confidence: "medium",
        chosen_level: "B2", answers: input.answers,
      },
    })]);
    expect(queries.map(({ table }) => table).slice(0, 2)).toEqual(["skill_estimate", "assessment_result"]);
  });

  it("sets the reading estimate from the level kept, replacing a previous one, and leaves the other skills and learners alone", async () => {
    const estimate = (userId: string, skill: string, levelValue: number, source: string) =>
      ({ user_id: userId, language: "ru", skill, level_value: levelValue, uncertainty: 1, source });
    const { client } = tableFake({
      assessment_result: [],
      skill_estimate: [estimate(user, "reading", 1.5, "declared"), estimate(user, "listening", 1.5, "declared"), estimate(other, "reading", 1.5, "declared")],
    });
    await recordPlacementResult(client, user, input);
    const rows = (await client.schema("app").from("skill_estimate").select("*")).data;
    expect(rows).toEqual([
      { user_id: user, language: "ru", skill: "reading", level_value: 4.5, uncertainty: 0.75, source: "placement" },
      estimate(user, "listening", 1.5, "declared"),
      estimate(other, "reading", 1.5, "declared"),
    ]);
  });
});

describe("hasPlacementOnVersion", () => {
  const result = (userId: string, language: string, status: string, version: string, kind = "placement") =>
    ({ id: crypto.randomUUID(), user_id: userId, language, kind, payload: { status, bank_version: version } });

  it("is true for a finished test of the language on this version of the bank, taken by the learner", async () => {
    const { client } = tableFake({ assessment_result: [result(user, "ru", "completed", "2026-11-27")] });
    expect(await hasPlacementOnVersion(client, user, "ru", "2026-11-27")).toBe(true);
  });

  it("is false for another version, language, kind, status or learner", async () => {
    const { client } = tableFake({
      assessment_result: [
        result(user, "ru", "completed", "2026-10-19"),
        result(user, "it", "completed", "2026-11-27"),
        result(user, "ru", "completed", "2026-11-27", "assessment"),
        result(user, "ru", "skipped", "2026-11-27"),
        result(other, "ru", "completed", "2026-11-27"),
      ],
    });
    expect(await hasPlacementOnVersion(client, user, "ru", "2026-11-27")).toBe(false);
  });
});
