import { describe, expect, it } from "vitest";
import { getRecentOralAttempts } from "./oral-attempts";
import { tableFake } from "./table-fake";

const USER = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";
const NOW = new Date("2026-11-26T12:00:00Z");

const row = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  user_id: USER,
  language: "it",
  step: "oral",
  exercise_kind: "oral_shadowing",
  answer: { text: "ciao", recognizer: "device", selfRating: null, sentenceId: "it-a1-01-saluer#d1", unitVersion: "0123456789ab" },
  correct: true,
  occurred_at: "2026-11-20T09:00:00Z",
  ...extra,
});

describe("getRecentOralAttempts", () => {
  it("reads the oral attempts of the user and language, newest first, as camelCase rows", async () => {
    const { client, queries } = tableFake({
      attempt: [
        row(1),
        row(2, { exercise_kind: "oral_dictation", correct: false, occurred_at: "2026-11-24T09:00:00Z", answer: { sentenceId: "it-a1-01-saluer#d2" } }),
        row(3, { step: "unit", exercise_kind: "unit_mcq" }),
        row(4, { language: "ru" }),
        row(5, { user_id: OTHER }),
        row(6, { occurred_at: "2026-10-01T09:00:00Z" }),
      ],
    });
    expect(await getRecentOralAttempts(client, USER, "it", 30, NOW)).toEqual([
      { sentenceId: "it-a1-01-saluer#d2", activity: "dictation", occurredAt: "2026-11-24T09:00:00Z", correct: false },
      { sentenceId: "it-a1-01-saluer#d1", activity: "shadowing", occurredAt: "2026-11-20T09:00:00Z", correct: true },
    ]);
    // The window starts `sinceDays` before now, and the user and the step are filtered explicitly.
    const chain = queries[0]?.chain.join(" ");
    expect(chain).toContain(`eq("user_id","${USER}")`);
    expect(chain).toContain('eq("step","oral")');
    expect(chain).toContain('gte("occurred_at","2026-10-27T12:00:00.000Z")');
  });

  it("leaves out a row whose answer names no sentence", async () => {
    const { client } = tableFake({ attempt: [row(1, { answer: { text: "ciao" } }), row(2, { answer: null }), row(3, { answer: [] })] });
    expect(await getRecentOralAttempts(client, USER, "it", 30, NOW)).toEqual([]);
  });

  it("takes 30 days by default", async () => {
    const { client } = tableFake({ attempt: [row(1, { occurred_at: new Date(Date.now() - 20 * 86_400_000).toISOString() }), row(2, { occurred_at: new Date(Date.now() - 40 * 86_400_000).toISOString() })] });
    expect(await getRecentOralAttempts(client, USER, "it")).toHaveLength(1);
  });
});
