import { describe, expect, it } from "vitest";
import { getProgressOverview } from "./progress-overview";
import { tableFake } from "./table-fake";

const user = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const activity = "2026-11-26T12:00:00Z";

describe("getProgressOverview", () => {
  it("reads pilot-language results and only the signed-in learner's active days in the window", async () => {
    const { client } = tableFake({
      skill_estimate: [
        { user_id: user, language: "ru", skill: "reading", source: "legacy", level_value: 3.5, uncertainty: 0.5, updated_at: activity },
        { user_id: user, language: "it", skill: "speaking", source: "declared", level_value: 1.5, uncertainty: 1, updated_at: activity },
      ],
      unit_progress: [
        { user_id: user, language: "ru", unit_id: "ru-a1-01", passed_at: activity },
        { user_id: user, language: "ru", unit_id: "ru-a1-02", passed_at: null },
        { user_id: user, language: "it", unit_id: "it-a1-01", passed_at: activity },
        { user_id: other, language: "ru", unit_id: "ru-a1-03", passed_at: activity },
      ],
      learning_day: [
        { user_id: user, day: "2026-11-20", first_activity_at: activity },
        { user_id: user, day: "2026-11-25", first_activity_at: null },
        { user_id: user, day: "2026-11-26", first_activity_at: activity },
        { user_id: user, day: "2026-11-19", first_activity_at: activity },
        { user_id: user, day: "2026-11-27", first_activity_at: activity },
        { user_id: other, day: "2026-11-24", first_activity_at: activity },
      ],
    });

    const russian = await getProgressOverview(client, user, "ru", "2026-11-20", "2026-11-26");
    expect(russian.skills.map(({ skill, source }) => [skill, source])).toEqual([["reading", "legacy"]]);
    expect(russian.passedUnits.map(({ unitId }) => unitId)).toEqual(["ru-a1-01"]);
    expect(russian.studyDays).toEqual(["2026-11-20", "2026-11-26"]);

    const italian = await getProgressOverview(client, user, "it", "2026-11-20", "2026-11-26");
    expect(italian.skills.map(({ skill, source }) => [skill, source])).toEqual([["speaking", "declared"]]);
    expect(italian.passedUnits.map(({ unitId }) => unitId)).toEqual(["it-a1-01"]);
    expect(italian.studyDays).toEqual(russian.studyDays);
  });
});
