import { describe, expect, it } from "vitest";
import type { StoredSessionPlan } from "@dailylingua/schemas";
import { insertSession, readLastSessionDay, readQuotaUsage, readSessionOfDay, readTextCandidates, readTextWithItems } from "./session-today";
import { tableFake } from "./table-fake";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ME = ID(1);
const OTHER = ID(2);

const sessionRow = (id: string, kind: string, extra: Record<string, unknown> = {}) => ({
  id,
  user_id: ME,
  language: "it",
  day: "2026-11-18",
  kind,
  format: 15,
  status: "planned",
  served_at: "2026-11-18T07:00:00+00:00",
  started_at: null,
  completed_at: null,
  plan: {},
  ...extra,
});

describe("readSessionOfDay", () => {
  it("prefers the daily session, then the review-only one, and never a catch-up one", async () => {
    const both = tableFake({ session: [sessionRow(ID(10), "review_only"), sessionRow(ID(11), "daily"), sessionRow(ID(12), "catch_up")] });
    expect((await readSessionOfDay(both.client, ME, "it", "2026-11-18"))?.id).toBe(ID(11));
    const review = tableFake({ session: [sessionRow(ID(10), "review_only"), sessionRow(ID(12), "catch_up")] });
    expect((await readSessionOfDay(review.client, ME, "it", "2026-11-18"))?.id).toBe(ID(10));
    const none = tableFake({ session: [sessionRow(ID(12), "catch_up")] });
    expect(await readSessionOfDay(none.client, ME, "it", "2026-11-18")).toBeNull();
  });

  it("is scoped to the user, the language and the day", async () => {
    const { client } = tableFake({ session: [sessionRow(ID(10), "daily", { user_id: OTHER }), sessionRow(ID(11), "daily", { day: "2026-11-17" }), sessionRow(ID(12), "daily", { language: "es" })] });
    expect(await readSessionOfDay(client, ME, "it", "2026-11-18")).toBeNull();
  });
});

describe("readLastSessionDay", () => {
  it("ignores a session that was only planned", async () => {
    const { client } = tableFake({
      session: [sessionRow(ID(10), "daily", { day: "2026-11-10", status: "completed" }), sessionRow(ID(11), "daily", { day: "2026-11-15", status: "planned" }), sessionRow(ID(12), "daily", { day: "2026-11-12", status: "started" })],
    });
    expect(await readLastSessionDay(client, ME, "it")).toBe("2026-11-12");
  });
});

describe("readTextCandidates", () => {
  const text = (id: string, extra: Record<string, unknown> = {}) => ({ id, language: "it", status: "published", level_band: "B1", density: 2, created_at: "2026-11-01T00:00:00+00:00", writing_task: "Racconta", ...extra });

  it("keeps published texts with a writing task that the learner neither read nor was served", async () => {
    const { client } = tableFake({
      text: [text(ID(100)), text(ID(101)), text(ID(102)), text(ID(103), { status: "generated" }), text(ID(104), { writing_task: null }), text(ID(105), { level_band: "C1" }), text(ID(106), { language: "es" })],
      text_read: [{ user_id: ME, text_id: ID(100) }],
      session: [sessionRow(ID(10), "daily", { plan: { reading: { textId: ID(101) } } })],
    });
    const found = await readTextCandidates(client, ME, "it", ["A2", "B1"]);
    expect(found.map((t) => t.id)).toEqual([ID(102)]);
  });

  it("does not count what another learner read or was served", async () => {
    const { client } = tableFake({
      text: [text(ID(100))],
      text_read: [{ user_id: OTHER, text_id: ID(100) }],
      session: [sessionRow(ID(10), "daily", { user_id: OTHER, plan: { reading: { textId: ID(100) } } })],
    });
    expect((await readTextCandidates(client, ME, "it", ["B1"])).map((t) => t.id)).toEqual([ID(100)]);
  });
});

describe("readTextWithItems", () => {
  it("returns a published text with its items and keys, and nothing for another status", async () => {
    const row = { id: ID(100), language: "it", level_band: "B1", density: 2, theme: "voyage", title: "T", body: "B", word_count: 1, new_words: [], grammar_point: null, listening_segment: { from: 0, to: 2 }, writing_task: "Racconta", status: "published" };
    const data = {
      text: [row],
      text_item: [{ id: ID(200), text_id: ID(100), step: "reading", kind: "mcq", position: 0, prompt: {}, listening_only: true }],
      text_item_key: [{ item_id: ID(200), answer: "a", accept: [] }],
    };
    const found = await readTextWithItems(tableFake(data).client, ID(100));
    expect(found?.text.writingTask).toBe("Racconta");
    expect(found?.text.listeningSegment).toEqual({ from: 0, to: 2 });
    expect(found?.items).toEqual([{ id: ID(200), textId: ID(100), step: "reading", kind: "mcq", position: 0, prompt: {}, listeningOnly: true, key: { answer: "a", accept: [] } }]);
    expect(await readTextWithItems(tableFake({ ...data, text: [{ ...row, status: "retired" }] }).client, ID(100))).toBeNull();
  });
});

describe("readQuotaUsage", () => {
  it("gives 0 for a kind with no line", async () => {
    const { client } = tableFake({ quota_usage: [{ user_id: ME, day: "2026-11-18", kind: "writing_feedback", used: 2 }, { user_id: OTHER, day: "2026-11-18", kind: "rewrite_check", used: 5 }] });
    expect(await readQuotaUsage(client, ME, "2026-11-18", ["writing_feedback", "rewrite_check"])).toEqual({ writing_feedback: 2, rewrite_check: 0 });
  });
});

describe("insertSession", () => {
  const plan: StoredSessionPlan = {
    v: 1,
    steps: [{ step: "wake", minutes: 3, required: true }],
    requiredSteps: ["wake"],
    wake: { cardIds: [], newCardIds: [], budgetMinutes: 3, errorItemId: null },
    reading: { textId: null, itemIds: [] },
    workshop: { itemIds: [] },
    momentumWords: null,
    rewriteSentences: 0,
    servedCards: {},
    resumption: false,
    newCardsSuspendedThrough: null,
  };
  const input = { id: ID(60), userId: ME, language: "it", day: "2026-11-18", kind: "review_only" as const, format: 15 as const, plan, servedAt: "2026-11-18T07:00:00.000Z" };

  it("inserts with ON CONFLICT DO NOTHING on (user, language, day, kind), then reads the row", async () => {
    const { client, queries, store } = tableFake({ session: [] });
    const row = await insertSession(client, input);
    expect(queries[0]?.chain[0]).toContain('"onConflict":"user_id,language,day,kind"');
    expect(queries[0]?.chain[0]).toContain('"ignoreDuplicates":true');
    expect(store.session).toHaveLength(1);
    expect(row.kind).toBe("review_only");
    expect(row.id).toBe(ID(60));
    expect(row.servedAt).toBe("2026-11-18T07:00:00.000Z");
  });

  it("returns the existing row when the session is already there (a lost race keeps the winner's plan)", async () => {
    const winner = sessionRow(ID(50), "review_only", { plan: { winner: true }, served_at: "2026-11-18T06:00:00+00:00" });
    const { client, store } = tableFake({ session: [winner] });
    const row = await insertSession(client, input);
    expect(row.id).toBe(ID(50));
    expect(row.plan).toEqual({ winner: true });
    expect(store.session).toHaveLength(1);
  });
});
