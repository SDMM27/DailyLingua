import { ingestPayloadSchema, type IngestPayload, type OralSentence } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { DAY_MS } from "../game";
import { NOW, TODAY, UNIT_ID, UNIT_VERSION, emptyState, eventWriter, iso } from "./fixtures";
import { planIngest } from "./plan-ingest";
import type { IngestState, RawEvent, StateDay } from "./types";

/** Plans a batch and checks that the payload obeys the contract of `ingest_batch`. */
function plan(state: IngestState, events: RawEvent[], now = NOW) {
  const result = planIngest(state, events, now);
  expect(ingestPayloadSchema.safeParse(result.payload).success).toBe(true);
  return result;
}

const xpOf = (payload: IngestPayload) => payload.xp.reduce((sum, line) => sum + line.amount, 0);
const dayWith = (xpByReason: Record<string, number>): StateDay => ({ xpByReason, reviewSuccesses: 0, newCards: 0, readingTexts: 0, rewards: {}, focusBySession: {}, rewardsByCorrection: {}, counted: [] });

describe("planIngest: oral workshop", () => {
  const SENTENCE_ID = `${UNIT_ID}#d1`;
  const OTHER_ID = `${UNIT_ID}#d2`;
  const sentence = (id: string, extra: Partial<OralSentence> = {}): OralSentence => ({
    id,
    unitId: UNIT_ID,
    unitVersion: UNIT_VERSION,
    unitOrder: 1,
    language: "it",
    text: "Vorrei un caffè per favore",
    translation: { fr: "Je voudrais un café", en: "I would like a coffee" },
    audio: "audio/it/d1.mp3",
    words: 5,
    ...extra,
  });
  const oralState = (extra: Partial<IngestState> = {}) =>
    emptyState({ oralSentences: { [SENTENCE_ID]: sentence(SENTENCE_ID), [OTHER_ID]: sentence(OTHER_ID, { text: "Buongiorno a tutti", words: 3 }) }, ...extra });
  const at = (seconds: number, day = TODAY) => new Date(Date.parse(iso("09:00:00", day)) + seconds * 1000).toISOString();
  /** An oral attempt ending at second `seconds`: shown 20 s earlier, speaking or typing over the last `lasted` seconds. */
  const oral = (ev: ReturnType<typeof eventWriter>, seconds: number, extra: Record<string, unknown> = {}, lasted = 4, day = TODAY) =>
    ev("oral_attempt", at(seconds, day), {
      sentenceId: SENTENCE_ID,
      unitVersion: UNIT_VERSION,
      activity: "shadowing",
      answer: "vorrei un caffè per favore",
      recognizer: "device",
      selfRating: null,
      shownAt: at(seconds - 20, day),
      startedAt: at(seconds - lasted, day),
      endedAt: at(seconds, day),
      ...extra,
    });
  const dictation = (ev: ReturnType<typeof eventWriter>, seconds: number, answer: string, extra: Record<string, unknown> = {}) =>
    oral(ev, seconds, { activity: "dictation", recognizer: "none", answer, ...extra });

  it("pays shadowing.sentence (1 XP, fluency) for a recognised repetition and writes an attempt row without session", () => {
    const ev = eventWriter();
    const { payload, rejected, report } = plan(oralState(), [oral(ev, 30)]);
    expect(rejected).toEqual([]);
    expect(payload.attempts).toEqual([
      expect.objectContaining({
        session_id: null,
        language: "it",
        step: "oral",
        exercise_kind: "oral_shadowing",
        correct: true,
        duration_ms: 4000,
        answer: { text: "vorrei un caffè per favore", recognizer: "device", selfRating: null, sentenceId: SENTENCE_ID, unitVersion: UNIT_VERSION },
        result: { ratio: 1, declared: false },
      }),
    ]);
    expect(payload.attempts[0]?.exercise_ref).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.xp).toEqual([
      expect.objectContaining({
        reason: "shadowing.sentence",
        amount: 1,
        language: "it",
        rule_version: "j5.2",
        source: { kind: "attempt", client_event_id: payload.attempts[0]?.client_event_id },
        meta: expect.objectContaining({ volet: "fluency" }),
      }),
    ]);
    expect(report.zeroed).toEqual([]);
  });

  it("pays nothing for an anticipation or a repetition without recognition: declared, no reason", () => {
    const ev = eventWriter();
    const { payload, report } = plan(oralState(), [
      oral(ev, 30, { activity: "anticipation", recognizer: "none", answer: "", selfRating: "got_it" }),
      oral(ev, 60, { recognizer: "none", answer: "", selfRating: "not_yet" }),
    ]);
    expect(payload.xp).toEqual([]);
    expect(payload.attempts.map((row) => [row.exercise_kind, row.correct, row.result])).toEqual([
      ["oral_anticipation", true, { declared: true }],
      ["oral_shadowing", false, { declared: true }],
    ]);
    expect(payload.attempts[1]?.answer).toMatchObject({ text: "", recognizer: "none", selfRating: "not_yet" });
    expect(report.zeroed).toEqual([]);
  });

  it("pays nothing below 60 % and says nothing about it, then pays the sentence once it is said right", () => {
    const ev = eventWriter();
    const { payload, report } = plan(oralState(), [oral(ev, 30, { answer: "vorrei" }), oral(ev, 60)]);
    expect(payload.attempts[0]).toMatchObject({ correct: false, result: { ratio: 0.2, declared: false } });
    expect(payload.xp.map((line) => [line.reason, line.amount])).toEqual([["shadowing.sentence", 1]]);
    expect(report.zeroed).toEqual([]);
  });

  it("pays a repetition from 60 % (3 words of 5)", () => {
    const ev = eventWriter();
    const { payload } = plan(oralState(), [oral(ev, 30, { answer: "vorrei un caffè" })]);
    expect(payload.attempts[0]?.result).toMatchObject({ ratio: 0.6 });
    expect(xpOf(payload)).toBe(1);
  });

  it("zeroes a repetition faster than 250 ms a word (too_fast) and does not count the sentence as paid", () => {
    const ev = eventWriter();
    const { payload, report } = plan(oralState(), [oral(ev, 30, {}, 1), oral(ev, 60)]);
    expect(report.zeroed).toEqual([{ clientEventId: payload.attempts[0]?.client_event_id, reason: "too_fast" }]);
    expect(payload.attempts[0]?.result).toEqual({ ratio: 1, declared: false, xpReason: "too_fast" });
    expect(payload.xp.map((line) => line.amount)).toEqual([1]);
    // 1.25 s for 5 words is exactly 250 ms a word: enough.
    expect(xpOf(plan(oralState(), [oral(ev, 30, { startedAt: at(28.75) })]).payload)).toBe(1);
    expect(xpOf(plan(oralState(), [oral(ev, 30, { startedAt: at(28.8) })]).payload)).toBe(0);
  });

  it("pays a sentence once a learning day and an activity (already_counted_today), and again the next day", () => {
    const ev = eventWriter();
    const first = plan(oralState(), [oral(ev, 30), oral(ev, 60)]);
    expect(xpOf(first.payload)).toBe(1);
    expect(first.report.zeroed).toEqual([{ clientEventId: first.payload.attempts[1]?.client_event_id, reason: "already_counted_today" }]);
    expect(first.nextState.days[TODAY]?.counted).toContain(`oral:shadowing:${SENTENCE_ID}`);
    // The state the first batch left: the same day pays nothing more...
    expect(xpOf(plan(first.nextState, [oral(ev, 90)]).payload)).toBe(0);
    // ...the next learning day pays again.
    const tomorrow = new Date(NOW.getTime() + DAY_MS);
    expect(xpOf(plan(first.nextState, [oral(ev, 30, {}, 4, "2026-11-13")], tomorrow).payload)).toBe(1);
  });

  it("pays another sentence the same day", () => {
    const ev = eventWriter();
    const { payload } = plan(oralState(), [oral(ev, 30), oral(ev, 60, { sentenceId: OTHER_ID, answer: "buongiorno a tutti" })]);
    expect(xpOf(payload)).toBe(2);
  });

  it("caps the repetitions at 30 XP a day (cap_reached), without counting the sentence", () => {
    const ev = eventWriter();
    const full = oralState({ days: { [TODAY]: dayWith({ "shadowing.sentence": 30 }) } });
    const { payload, report, nextState } = plan(full, [oral(ev, 30)]);
    expect(payload.xp).toEqual([]);
    expect(report.zeroed).toEqual([{ clientEventId: payload.attempts[0]?.client_event_id, reason: "cap_reached" }]);
    expect(nextState.days[TODAY]?.counted).not.toContain(`oral:shadowing:${SENTENCE_ID}`);
    const almost = oralState({ days: { [TODAY]: dayWith({ "shadowing.sentence": 29 }) } });
    expect(xpOf(plan(almost, [oral(ev, 30)]).payload)).toBe(1);
  });

  it("pays a dictation 2 XP (input) at 95 % and over, 1 XP from 80 %, nothing below", () => {
    const ev = eventWriter();
    const exact = plan(oralState(), [dictation(ev, 30, "Vorrei un caffè per favore.")]);
    expect(exact.payload.xp).toEqual([
      expect.objectContaining({ reason: "dictation.sentence", amount: 2, rule_version: "j5.2", meta: expect.objectContaining({ volet: "input" }) }),
    ]);
    expect(exact.payload.attempts[0]).toMatchObject({ exercise_kind: "oral_dictation", step: "oral", correct: true, duration_ms: 20_000, result: { accuracy: 1, declared: false } });
    // 26 characters: one wrong letter is 96 %, two are 92 %, six are 77 %.
    expect(plan(oralState(), [dictation(ev, 30, "Vorrei un caffè per favoro")]).payload.xp[0]).toMatchObject({ amount: 2 });
    expect(plan(oralState(), [dictation(ev, 30, "Vorrei un caffè pxr favoro")]).payload.xp[0]).toMatchObject({ amount: 1 });
    const poor = plan(oralState(), [dictation(ev, 30, "Vorrei un cafxxxxxxxxxxxxxxxx")]);
    expect(poor.payload.xp).toEqual([]);
    expect(poor.report.zeroed).toEqual([]);
    expect(poor.payload.attempts[0]).toMatchObject({ correct: false });
  });

  it("zeroes a dictation answered within a second, pays it once a day, and caps it at 30 XP", () => {
    const ev = eventWriter();
    const fast = plan(oralState(), [dictation(ev, 30, "Vorrei un caffè per favore", { shownAt: at(29.5), startedAt: at(29.5) })]);
    expect(fast.report.zeroed).toEqual([{ clientEventId: fast.payload.attempts[0]?.client_event_id, reason: "too_fast" }]);
    const twice = plan(oralState(), [dictation(ev, 30, "Vorrei un caffè per favore"), dictation(ev, 60, "Vorrei un caffè per favore")]);
    expect(xpOf(twice.payload)).toBe(2);
    expect(twice.report.zeroed.map((entry) => entry.reason)).toEqual(["already_counted_today"]);
    const capped = plan(oralState({ days: { [TODAY]: dayWith({ "dictation.sentence": 29 }) } }), [dictation(ev, 30, "Vorrei un caffè per favore")]);
    expect(capped.payload.xp).toEqual([expect.objectContaining({ amount: 1 })]);
    const full = plan(oralState({ days: { [TODAY]: dayWith({ "dictation.sentence": 30 }) } }), [dictation(ev, 30, "Vorrei un caffè per favore")]);
    expect(full.report.zeroed).toEqual([{ clientEventId: full.payload.attempts[0]?.client_event_id, reason: "cap_reached" }]);
  });

  it("keeps the caps of the two activities apart, and pays the same sentence in each", () => {
    const ev = eventWriter();
    const state = oralState({ days: { [TODAY]: dayWith({ "shadowing.sentence": 30 }) } });
    expect(xpOf(plan(state, [dictation(ev, 30, "Vorrei un caffè per favore")]).payload)).toBe(2);
    expect(xpOf(plan(oralState(), [oral(ev, 30), dictation(ev, 60, "Vorrei un caffè per favore")]).payload)).toBe(3);
  });

  it("applies the accent tolerance of the profile to a dictation", () => {
    const ev = eventWriter();
    const lenient = plan(oralState(), [dictation(ev, 30, "Vorrei un caffe per favore")]);
    expect(lenient.payload.attempts[0]?.result).toMatchObject({ accuracy: 1 });
    const strictState = oralState();
    strictState.profile.answerTolerance = "strict";
    const strict = plan(strictState, [dictation(ev, 30, "Vorrei un caffe per favore")]);
    expect((strict.payload.attempts[0]?.result as { accuracy: number }).accuracy).toBeLessThan(1);
  });

  it("refuses an unknown sentence, another version of the unit and a language the learner is not enrolled in", () => {
    const ev = eventWriter();
    const unknown = oral(ev, 30, { sentenceId: `${UNIT_ID}#nope` });
    const proto = oral(ev, 31, { sentenceId: "__proto__" });
    const stale = oral(ev, 32, { unitVersion: "ffffffffffff" });
    const { payload, rejected } = plan(oralState(), [unknown, proto, stale]);
    expect(rejected).toEqual([
      { clientEventId: unknown.clientEventId, reason: "unknown_sentence" },
      { clientEventId: proto.clientEventId, reason: "unknown_sentence" },
      { clientEventId: stale.clientEventId, reason: "unit_version_mismatch" },
    ]);
    expect(payload.attempts).toEqual([]);
    expect(payload.xp).toEqual([]);
    const foreign = oral(ev, 33);
    const russian = plan(oralState({ profile: { ...emptyState().profile, enrolledLanguages: ["ru"] } }), [foreign]);
    expect(russian.rejected).toEqual([{ clientEventId: foreign.clientEventId, reason: "wrong_language" }]);
    expect(russian.payload.attempts).toEqual([]);
  });

  it("writes nothing for an event already ingested", () => {
    const ev = eventWriter();
    const event = oral(ev, 30);
    const first = plan(oralState(), [event]);
    const again = plan(first.nextState, [event]);
    expect(again.report.duplicates).toEqual([event.clientEventId]);
    expect(again.payload.attempts).toEqual([]);
    expect(again.payload.xp).toEqual([]);
  });

  it("counts an oral attempt as activity of the day, even a declared one", () => {
    const ev = eventWriter();
    const { payload } = plan(oralState(), [oral(ev, 30, { activity: "anticipation", recognizer: "none", answer: "", selfRating: "got_it" })]);
    expect(payload.learning_days.map((row) => row.day)).toEqual([TODAY]);
  });
});
