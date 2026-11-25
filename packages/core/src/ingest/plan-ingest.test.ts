import { ingestPayloadSchema, isEmptyIngestPayload, type IngestPayload } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { HOUR_MS, DAY_MS } from "../game";
import { planIngest } from "./plan-ingest";
import { ASSESSMENT_UNIT_ID, NOW, SCRIPT_UNIT_ID, SESSION, TEXT, TODAY, UNIT_ID, UNIT_VERSION, card, correction, emptyState, eventWriter, item, iso, review, scriptUnit, assessmentUnit, session, text, unit, uuid, words } from "./fixtures";
import type { IngestState, RawEvent } from "./types";

/** Plans a batch and checks that the payload obeys the contract of `ingest_batch`. */
function plan(state: IngestState, events: RawEvent[], now = NOW) {
  const result = planIngest(state, events, now);
  expect(ingestPayloadSchema.safeParse(result.payload).success).toBe(true);
  return result;
}

const xpOf = (payload: IngestPayload) => payload.xp.reduce((sum, line) => sum + line.amount, 0);
const reasons = (payload: IngestPayload) => payload.xp.map((line) => line.reason);

describe("planIngest: reviews", () => {
  const state = () => emptyState({ cards: { [uuid(31)]: card(uuid(31)) } });

  it("grades a card with the server key, schedules it with FSRS and pays 1 XP", () => {
    const ev = eventWriter();
    const { payload, rejected, report } = plan(state(), [review(ev, uuid(31), iso("09:00:10"))]);
    expect(rejected).toEqual([]);
    expect(payload.reviews).toHaveLength(1);
    expect(payload.reviews[0]).toMatchObject({ card_id: uuid(31), rating: 3, mode: "recognition", reviewed_at: iso("09:00:10") });
    expect(payload.reviews[0]?.card.reps).toBe(4);
    expect(payload.xp).toEqual([
      expect.objectContaining({ reason: "review.recognition", amount: 1, day: TODAY, language: "it", rule_version: "j5.1", league_eligible: true, source: { kind: "review", client_event_id: payload.reviews[0]?.client_event_id } }),
    ]);
    expect(payload.xp[0]?.meta).toMatchObject({ occurredDay: TODAY, late: false, long: false, diminished: false, volet: "study" });
    expect(payload.learning_days).toEqual([expect.objectContaining({ day: TODAY, xp_verified: 1, validated: false, cause: "none", time_zone: "Europe/Paris" })]);
    expect(payload.device_cursors).toEqual([{ device_id: uuid(900), last_seq: 1, last_day: TODAY }]);
    expect(report.accepted).toBe(1);
  });

  it("pays the difficulty bonus under 3 days of stability and the reconquest bonus", () => {
    const hard = emptyState({ cards: { [uuid(31)]: card(uuid(31), { stability: 2, lastReview: { day: "2026-11-11", rating: 1 } }) } });
    const { payload } = plan(hard, [review(eventWriter(), uuid(31), iso("09:00:10"))]);
    expect(reasons(payload).sort()).toEqual(["review.bonus.difficulty", "review.bonus.reconquest", "review.recognition"]);
    expect(xpOf(payload)).toBe(3);
  });

  it("grades a review with its named session's mode even if the latest card key is different", () => {
    const cardId = uuid(31);
    const s = emptyState({
      cards: { [cardId]: card(cardId, { optionId: cardId, accept: [], productionAccept: ["parola"] }) },
      sessions: { [SESSION]: session({ servedCards: { [cardId]: "production" }, wakeCardIds: [cardId] }) },
    });
    const event = review(eventWriter(), cardId, iso("09:00:10"), "parola", 3000, "production");
    const named = { ...event, payload: { ...(event.payload as Record<string, unknown>), sessionId: SESSION } };
    expect(plan(s, [named]).payload.reviews[0]?.rating).toBe(3);
    const wrongMode = { ...named, payload: { ...named.payload, mode: "recognition" } };
    expect(plan(s, [wrongMode]).rejected[0]?.reason).toBe("invalid_payload");
  });

  it("pays 2 XP for a typed answer, with the diacritics tolerance, and a Hard rating for 'almost'", () => {
    const s = emptyState({ cards: { [uuid(31)]: card(uuid(31), { optionId: null, accept: ["perché"] }) } });
    const { payload } = plan(s, [review(eventWriter(), uuid(31), iso("09:00:10"), "perche", 3000, "production")]);
    expect(payload.reviews[0]?.rating).toBe(2);
    expect(reasons(payload)).toEqual(["review.production"]);
    expect(xpOf(payload)).toBe(2);
  });

  it("gives no XP and a reason for a card not due, an answer too fast, and a second pass on the same card", () => {
    const s = emptyState({ cards: { [uuid(31)]: card(uuid(31), { dueAt: "2026-11-20T10:00:00.000Z" }), [uuid(32)]: card(uuid(32)) } });
    const ev = eventWriter();
    const { payload, report } = plan(s, [review(ev, uuid(31), iso("09:00:10")), review(ev, uuid(32), iso("09:00:20"), "ok", 300), review(ev, uuid(32), iso("09:00:40")), review(ev, uuid(32), iso("09:00:50"))]);
    expect(report.zeroed.map((z) => z.reason)).toEqual(["not_due", "too_fast", "not_due", "not_due"]);
    expect(payload.reviews).toHaveLength(4);
    expect(xpOf(payload)).toBe(0);
  });

  it("pays nothing for a wrong answer and rates it Again", () => {
    const { payload, report } = plan(state(), [review(eventWriter(), uuid(31), iso("09:00:10"), "nope")]);
    expect(payload.reviews[0]?.rating).toBe(1);
    expect(payload.xp).toEqual([]);
    expect(report.zeroed).toEqual([]);
  });

  it("pays only one success a day on a card, and caps the revisions at 120 XP", () => {
    const cards = Object.fromEntries(Array.from({ length: 130 }, (_, i) => [uuid(500 + i), card(uuid(500 + i))]));
    const ev = eventWriter();
    const events = Object.keys(cards).map((id, i) => review(ev, id, new Date(Date.parse(iso("08:00:00")) + i * 5000).toISOString()));
    const { payload, report } = plan(emptyState({ cards }), events);
    expect(xpOf(payload)).toBe(120);
    expect(report.zeroed.filter((z) => z.reason === "cap_reached")).toHaveLength(10);
    expect(payload.xp.every((line) => line.amount <= 100)).toBe(true);
  });

  it("limits the new cards of the day", () => {
    const cards = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [uuid(600 + i), card(uuid(600 + i), { state: "new", stability: null, difficulty: null, lastReviewAt: null, reps: 0 })]));
    const ev = eventWriter();
    const events = Object.keys(cards).map((id, i) => review(ev, id, new Date(Date.parse(iso("08:00:00")) + i * 5000).toISOString()));
    const { payload } = plan(emptyState({ cards, sessions: { [SESSION]: session({ format: 15 }) } }), events);
    expect(xpOf(payload)).toBe(9); // 9 new cards a day at format 15
  });
});

describe("planIngest: error of the day", () => {
  const errorId = uuid(91);
  const error = item(errorId, {
    textId: null, kind: "cloze", answer: null, accept: ["sono andato", "sono arrivato"], origin: "error_of_day",
    errorItemId: errorId, errorOfDay: { correctionId: uuid(93), createdDay: "2026-11-11", recurring: false },
    card: { kind: "correction", front: "Io ho andato a Roma.", back: "sono andato", backLanguage: "fr", context: "ho andato" },
  });
  const state = emptyState({ items: { [errorId]: error }, sessions: { [SESSION]: session({ errorItemId: errorId, requiredSteps: ["wake"], kind: "review_only" }) } });

  it("validates wake after the answer and awards the reworked error only once", () => {
    const ev = eventWriter();
    const started = plan(state, [ev("session_started", iso("09:00:00"), { sessionId: SESSION })]);
    expect(started.payload.session_steps.find((step) => step.step === "wake")?.validated_at).toBeFalsy();
    const focus = (answer: string) => ev("focus_attempt", iso("09:00:15"), { sessionId: SESSION, itemId: errorId, try: 1, shownAt: iso("09:00:10"), answer });
    const { payload } = plan(started.nextState, [focus("sono arrivato"), focus("sono andato")]);
    expect(payload.attempts).toHaveLength(2);
    expect(payload.attempts[0]).toMatchObject({ step: "wake", exercise_kind: "error_fix", correct: true });
    expect(payload.error_items).toEqual([{ id: errorId, reworked_day: TODAY }]);
    expect(payload.xp.filter(({ reason }) => reason === "error_of_day.reworked")).toEqual([expect.objectContaining({ amount: 3 })]);
    expect(payload.session_steps).toContainEqual(expect.objectContaining({ step: "wake", validated_at: iso("09:00:15") }));
  });

  it("makes one feedback card after a wrong answer and refuses an unserved error", () => {
    const ev = eventWriter();
    const wrong = (itemId: string) => ev("focus_attempt", iso("09:00:15"), { sessionId: SESSION, itemId, try: 1, shownAt: iso("09:00:10"), answer: "ho andato" });
    const { payload, rejected } = plan(state, [wrong(uuid(92)), wrong(errorId), wrong(errorId)]);
    expect(rejected[0]?.reason).toBe("unknown_item");
    expect(payload.error_items).toEqual([]);
    expect(payload.xp.filter(({ reason }) => reason === "error_of_day.reworked")).toEqual([]);
    expect(payload.cards_created).toEqual([expect.objectContaining({
      source: "feedback", kind: "correction", payload: { itemId: errorId, errorOfDay: true, accept: error.accept },
    })]);
  });
});

describe("planIngest: refusals", () => {
  const ev = eventWriter();
  const base = emptyState({ cards: { [uuid(31)]: card(uuid(31)), [uuid(33)]: card(uuid(33), { userId: uuid(2) }) }, sessions: { [SESSION]: session({ servedAt: iso("08:00:00") }), [uuid(11)]: session({ id: uuid(11), userId: uuid(2) }) } });

  it("refuses with the reason of the specs", () => {
    const events = [
      review(ev, uuid(32), iso("09:00:10")), // unknown card
      review(ev, uuid(33), iso("09:00:11")), // someone else's card
      ev("session_started", iso("09:00:12"), { sessionId: uuid(12) }), // unknown session
      ev("session_started", iso("09:00:13"), { sessionId: uuid(11) }), // foreign session
      ev("session_started", iso("12:06:00"), { sessionId: SESSION }), // in the future (> 5 min)
      ev("session_started", iso("07:58:00"), { sessionId: SESSION }), // before the packet was served
      ev("session_started", "2026-11-03T09:00:00.000Z", { sessionId: SESSION }), // too old
      ev("rewrite_submitted", iso("09:00:14"), { correctionId: uuid(40), sentenceIndex: 0, text: "x" }), // unknown correction
      { clientEventId: uuid(999), kind: "review_attempt", occurredAt: iso("09:00:15"), payload: { cardId: uuid(31), xp: 5 } }, // invalid
    ];
    const { rejected, payload } = plan(base, events);
    expect(rejected.map((r) => r.reason)).toEqual(["invalid_payload", "unknown_card", "unknown_card", "unknown_session", "foreign_session", "in_future", "before_served", "too_old", "unknown_correction"]);
    expect(isEmptyIngestPayload(payload)).toBe(true);
  });

  it("refuses the same id with a different payload and ignores an identical copy", () => {
    const one = review(eventWriter(200), uuid(31), iso("09:00:10"));
    const changed = { ...one, payload: { ...(one.payload as object), answer: "other" } };
    const { rejected, payload } = plan(base, [one, one, changed]);
    expect(rejected).toEqual([{ clientEventId: one.clientEventId, reason: "duplicate_conflict" }]);
    expect(payload.reviews).toHaveLength(1);
  });
});

describe("planIngest: replay and order", () => {
  const cards = { [uuid(31)]: card(uuid(31)), [uuid(32)]: card(uuid(32), { stability: 2 }) };
  const events = () => {
    const ev = eventWriter();
    return [
      ev("session_started", iso("09:00:00"), { sessionId: SESSION }),
      review(ev, uuid(31), iso("09:00:10")),
      review(ev, uuid(32), iso("09:00:20")),
    ];
  };
  const state = () => emptyState({ cards, sessions: { [SESSION]: session({ wakeCardIds: [uuid(31), uuid(32)] }) } });

  it("is deterministic: the same state, events and instant give the same result", () => {
    expect(planIngest(state(), events(), NOW)).toEqual(planIngest(state(), events(), NOW));
  });

  it("does not modify its input", () => {
    const s = state();
    const before = JSON.stringify(s);
    planIngest(s, events(), NOW);
    expect(JSON.stringify(s)).toBe(before);
  });

  it("writes nothing the second time: a replay of the same events changes nothing", () => {
    const first = plan(state(), events());
    expect(first.payload.reviews).toHaveLength(2);
    const second = plan(first.nextState, events());
    expect(isEmptyIngestPayload(second.payload)).toBe(true);
    expect(second.report.duplicates).toHaveLength(3);
    expect(second.rejected).toEqual([]);
    expect(second.nextState).toEqual(first.nextState);
  });

  it("does not depend on the order the events arrive in", () => {
    const forward = plan(state(), events());
    const backward = plan(state(), [...events()].reverse());
    expect(backward.payload).toEqual(forward.payload);
    expect(backward.nextState).toEqual(forward.nextState);
  });

  it("gives the same days and streak whatever the order of two batches from two devices", () => {
    const a = eventWriter(300, uuid(901));
    const b = eventWriter(400, uuid(902));
    const batchA = [review(a, uuid(31), iso("09:00:10"))];
    const batchB = [review(b, uuid(32), iso("09:30:10"))];
    const finalOf = (first: RawEvent[], second: RawEvent[]) => planIngest(planIngest(state(), first, NOW).nextState, second, NOW);
    const ab = finalOf(batchA, batchB);
    const ba = finalOf(batchB, batchA);
    expect(ab.nextState.learningDays).toEqual(ba.nextState.learningDays);
    expect(ab.payload.streak).toEqual(ba.payload.streak);
    expect(ab.nextState.cards).toEqual(ba.nextState.cards);
  });
});

describe("planIngest: late batches", () => {
  const state = () => emptyState({ cards: { [uuid(31)]: card(uuid(31)) } });
  const at = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
  const answered = (ms: number) => planIngest(state(), [review(eventWriter(), uuid(31), at(ms))], NOW);

  it("counts an event at 71 hours in the ring and the streak, on the day of the action", () => {
    const { payload, report } = answered(71 * HOUR_MS);
    expect(payload.xp[0]).toMatchObject({ amount: 1, day: "2026-11-09" });
    expect(payload.xp[0]?.meta).toMatchObject({ late: false, occurredDay: "2026-11-09" });
    expect(payload.learning_days).toEqual([expect.objectContaining({ day: "2026-11-09", xp_verified: 1 })]);
    expect(report.late).toBe(0);
  });

  it("writes an event at 73 hours on the reception day, flagged late, out of the days and the streak", () => {
    const { payload, report } = answered(73 * HOUR_MS);
    expect(payload.reviews).toHaveLength(1);
    expect(payload.xp[0]).toMatchObject({ amount: 1, day: TODAY });
    expect(payload.xp[0]?.meta).toMatchObject({ late: true, occurredDay: "2026-11-09" });
    expect(payload.learning_days).toEqual([]);
    expect(payload.streak).toBeNull();
    expect(report.late).toBe(1);
    expect(report.lateXp).toBe(1);
  });

  it("refuses a batch at 8 days", () => {
    const { payload, rejected } = answered(8 * DAY_MS);
    expect(rejected.map((r) => r.reason)).toEqual(["too_old"]);
    expect(isEmptyIngestPayload(payload)).toBe(true);
  });

  it("keeps late XP inside the SQL bound of the XP day, [server day - 3, + 1]", () => {
    for (const hours of [73, 100, 150, 167]) {
      const { payload } = answered(hours * HOUR_MS);
      for (const line of payload.xp) expect(line.day >= "2026-11-09" && line.day <= "2026-11-13").toBe(true);
    }
  });

  it("applies the caps of the day of the action to a late event", () => {
    const cards = Object.fromEntries(Array.from({ length: 125 }, (_, i) => [uuid(700 + i), card(uuid(700 + i))]));
    const ev = eventWriter();
    const events = Object.keys(cards).map((id, i) => review(ev, id, at(80 * HOUR_MS - i * 1000)));
    const { payload } = planIngest(emptyState({ cards }), events, NOW);
    expect(xpOf(payload)).toBe(120);
    expect(payload.xp.every((line) => line.day === TODAY && line.meta.late === true)).toBe(true);
  });
});

describe("planIngest: time zones and days", () => {
  const cards = { [uuid(31)]: card(uuid(31)), [uuid(32)]: card(uuid(32)) };

  it("writes the day of the zone of the device, with the 04:00 start", () => {
    // 02:30 in Paris on the 12th is still the 11th.
    const { payload } = plan(emptyState({ cards }), [review(eventWriter(), uuid(31), "2026-11-12T01:30:00.000Z")], new Date("2026-11-12T08:00:00Z"));
    expect(payload.learning_days[0]?.day).toBe("2026-11-11");
  });

  it("follows a trip to the east or to the west, adding a journal entry and its baseline", () => {
    const tokyo = eventWriter(100, uuid(900), "Asia/Tokyo");
    const east = plan(emptyState({ cards }), [review(tokyo, uuid(31), "2026-11-12T10:00:00.000Z")]);
    expect(east.payload.timezone_changes).toEqual([
      { effective_at: "2026-10-01T00:00:00.000Z", time_zone: "Europe/Paris" },
      { effective_at: "2026-11-12T10:00:00.000Z", time_zone: "Asia/Tokyo" },
    ]);
    expect(east.payload.streak?.time_zone_changed_at).toBe("2026-11-12T10:00:00.000Z");
    expect(east.payload.learning_days[0]).toMatchObject({ day: "2026-11-12", time_zone: "Asia/Tokyo" });
    const nyc = eventWriter(100, uuid(900), "America/New_York");
    const west = plan(emptyState({ cards }), [review(nyc, uuid(31), "2026-11-12T10:00:00.000Z")]);
    expect(west.payload.timezone_changes.at(-1)).toEqual({ effective_at: "2026-11-12T10:00:00.000Z", time_zone: "America/New_York" });
    expect(west.payload.learning_days[0]).toMatchObject({ day: "2026-11-12", time_zone: "America/New_York" });
  });

  it("accepts one change of zone in 48 hours, then keeps the first", () => {
    const tokyo = eventWriter(100, uuid(900), "Asia/Tokyo");
    const rome = eventWriter(200, uuid(901), "Europe/Rome");
    const { payload } = plan(emptyState({ cards }), [review(tokyo, uuid(31), "2026-11-12T08:00:00.000Z"), review(rome, uuid(32), "2026-11-12T10:00:00.000Z")]);
    expect(payload.timezone_changes.filter((c) => c.time_zone !== "Europe/Paris")).toEqual([{ effective_at: "2026-11-12T08:00:00.000Z", time_zone: "Asia/Tokyo" }]);
    const later = emptyState({ cards, timezoneChanges: [{ effectiveAt: "2026-10-01T00:00:00.000Z", timeZone: "Europe/Paris" }, { effectiveAt: "2026-11-10T11:00:00.000Z", timeZone: "Asia/Tokyo" }], streak: { timeZoneChangedAt: "2026-11-10T11:00:00.000Z" } });
    const back = plan(later, [review(eventWriter(300, uuid(902), "Europe/Rome"), uuid(32), "2026-11-12T11:30:00.000Z")]);
    expect(back.payload.timezone_changes.at(-1)).toEqual({ effective_at: "2026-11-12T11:30:00.000Z", time_zone: "Europe/Rome" });
  });

  it("never goes back a day on the same device when the zone moves west", () => {
    // Tokyo at 20:00 local on the 13th (11:00Z), then New York two days later reporting an instant that is "earlier" locally.
    const device = uuid(900);
    const first = eventWriter(100, device, "Asia/Tokyo");
    const afterTrip = emptyState({ cards });
    const one = plan(afterTrip, [review(first, uuid(31), "2026-11-10T22:00:00.000Z")], new Date("2026-11-11T08:00:00Z"));
    expect(one.payload.learning_days[0]?.day).toBe("2026-11-11"); // 07:00 on the 11th in Tokyo
    const second = eventWriter(200, device, "America/New_York");
    const e2 = { ...review(second, uuid(32), "2026-11-13T06:00:00.000Z"), payload: { ...(review(second, uuid(32), "2026-11-13T06:00:00.000Z").payload as object), seq: 5 } };
    const two = plan(one.nextState, [e2], new Date("2026-11-13T08:00:00Z"));
    const day = two.payload.learning_days[0]?.day as string;
    expect(day >= "2026-11-11").toBe(true);
  });

  it("counts a clock rollback and keeps the day monotone", () => {
    const ev = eventWriter();
    const a = review(ev, uuid(31), "2026-11-12T10:00:00.000Z");
    const b = review(ev, uuid(32), "2026-11-12T09:50:00.000Z");
    const { report, payload } = plan(emptyState({ cards }), [a, b]);
    expect(report.clockRollbacks).toBe(1);
    expect(payload.learning_days).toHaveLength(1);
  });

  it("cuts the day at 04:00 local across a daylight saving change", () => {
    const ev = eventWriter();
    // 2026-10-25, the clocks go back: 03:00Z is 04:00 CET.
    const nov = new Date("2026-10-25T09:00:00Z");
    const early = plan(emptyState({ cards }), [review(ev, uuid(31), "2026-10-25T02:59:00.000Z")], nov);
    const late = plan(emptyState({ cards }), [review(eventWriter(500), uuid(32), "2026-10-25T03:00:00.000Z")], nov);
    expect(early.payload.learning_days[0]?.day).toBe("2026-10-24");
    expect(late.payload.learning_days[0]?.day).toBe("2026-10-25");
  });
});

describe("planIngest: a whole session", () => {
  const sourceBody = words("testo", 300);
  const sessionState = () =>
    emptyState({
      cards: { [uuid(31)]: card(uuid(31)), [uuid(32)]: card(uuid(32)) },
      texts: { [TEXT]: text({ body: sourceBody }) },
      items: {
        [uuid(51)]: item(uuid(51)),
        [uuid(52)]: item(uuid(52)),
        [uuid(53)]: item(uuid(53)),
        [uuid(54)]: item(uuid(54)),
        [uuid(61)]: item(uuid(61), { card: { kind: "word", front: "casa", back: "maison", backLanguage: "fr", context: "La casa è bella." } }),
        [uuid(62)]: item(uuid(62), { card: { kind: "word", front: "mela", back: "pomme", backLanguage: "fr", context: null } }),
      },
      sessions: {
        [SESSION]: session({
          wakeCardIds: [uuid(31), uuid(32)],
          readingItemIds: [uuid(51), uuid(52), uuid(53), uuid(54)],
          workshopItemIds: [uuid(61), uuid(62)],
        }),
      },
      corrections: {
        [uuid(41)]: correction(uuid(41), uuid(71), {
          sentences: [{ text: "io ho andato al mercato ieri", nativeText: "ieri sono andato al mercato", errors: [{ id: "e1", original: "ho andato", corrected: "sono andato" }] }],
        }),
      },
    });

  function fullSession() {
    const ev = eventWriter();
    const s = (sessionId = SESSION) => ({ sessionId });
    return [
      ev("session_started", iso("09:00:00"), s()),
      review(ev, uuid(31), iso("09:00:10")),
      review(ev, uuid(32), iso("09:00:20")),
      ev("reading_progress", iso("09:05:00"), { ...s(), textId: TEXT, ratio: 0 }),
      ev("comprehension_answer", iso("09:05:30"), { ...s(), itemId: uuid(51), answer: "a" }),
      ev("comprehension_answer", iso("09:05:40"), { ...s(), itemId: uuid(52), answer: "a" }),
      ev("comprehension_answer", iso("09:05:50"), { ...s(), itemId: uuid(53), answer: "a" }),
      ev("comprehension_answer", iso("09:05:55"), { ...s(), itemId: uuid(54), answer: "b" }),
      ev("reading_progress", iso("09:06:00"), { ...s(), textId: TEXT, ratio: 1 }),
      ev("focus_attempt", iso("09:07:00"), { ...s(), itemId: uuid(61), try: 1, answer: "a", shownAt: iso("09:06:50") }),
      ev("focus_attempt", iso("09:07:20"), { ...s(), itemId: uuid(62), try: 1, answer: "a", shownAt: iso("09:07:10") }),
      ev("production_submitted", iso("09:09:00"), { ...s(), productionId: uuid(71), text: words("scritto", 70), composeMs: 120000 }),
      ev("rewrite_submitted", iso("09:10:00"), { correctionId: uuid(41), sentenceIndex: 0, text: "Io sono andato al mercato ieri" }),
      ev("fluency_pass", iso("09:12:00"), { ...s(), textId: TEXT, startedAt: iso("09:11:20"), endedAt: iso("09:12:00") }),
    ];
  }

  it("pays every rule once, validates the five steps and completes the session", () => {
    const { payload, rejected, report } = plan(sessionState(), fullSession());
    expect(rejected).toEqual([]);
    expect(reasons(payload).sort()).toEqual(
      ["fluency.pass", "focus.first_try", "focus.first_try", "production.corrected", "reading.understood", "review.recognition", "review.recognition", "rewrite.sentence", "session.complete"].sort(),
    );
    expect(xpOf(payload)).toBe(1 + 1 + 15 + 2 + 2 + 15 + 5 + 5 + 10);
    expect(payload.sessions).toEqual([{ id: SESSION, status: "completed", started_at: iso("09:00:00"), completed_at: iso("09:12:00") }]);
    expect(payload.session_steps.filter((row) => row.validated_at !== null).map((row) => row.step).sort()).toEqual(["expression", "momentum", "reading", "wake", "workshop"]);
    expect(payload.learning_days).toEqual([expect.objectContaining({ day: TODAY, xp_verified: 56, validated: true, cause: "work" })]);
    expect(payload.streak).toMatchObject({ current: 1, best: 1, freezes: 1, mode: "daily", last_day: TODAY });
    expect(payload.text_reads).toEqual([{ text_id: TEXT, first_read_day: TODAY }]);
    expect(payload.rewrites).toEqual([expect.objectContaining({ accepted: true, sentence_index: 0 })]);
    expect(payload.productions).toHaveLength(1);
    expect(payload.cards_created.map((c) => c.front).sort()).toEqual(["casa", "mela"]);
    expect(payload.cards_created.every((c) => c.source === "session" && c.due_at === "2026-11-13T03:00:00.000Z")).toBe(true);
    expect(report.xpByRule["session.complete"]).toBe(10);
  });

  it("gives every XP line without a source a distinguishing meta.ref", () => {
    const { payload } = plan(sessionState(), fullSession());
    const sourceless = payload.xp.filter((line) => line.source === null);
    expect(sourceless.map((line) => line.reason).sort()).toEqual(["production.corrected", "reading.understood", "rewrite.sentence", "session.complete"]);
    for (const line of sourceless) expect(typeof line.meta.ref).toBe("string");
    const keys = sourceless.map((line) => JSON.stringify([line.day, line.language, line.reason, line.meta]));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("does not reward a sentence already verified, even on a new day", () => {
    const base = sessionState();
    base.verifiedSentences = { [uuid(41)]: [0] };
    base.productions[uuid(71)] = {
      id: uuid(71), sessionId: SESSION, language: "it", text: words("scritto", 70), day: TODAY,
      late: false, settled: true, correctionDeferred: false, clientEventId: uuid(72), initialSimilarity: 0,
    };
    const event = eventWriter()("rewrite_submitted", iso("09:10:00"), {
      correctionId: uuid(41), sentenceIndex: 0, text: "Io sono andato al mercato ieri",
    });
    const { payload } = plan(base, [event]);
    expect(payload.rewrites).toEqual([expect.objectContaining({ accepted: true })]);
    expect(reasons(payload)).not.toContain("rewrite.sentence");
    expect(payload.session_steps).not.toContainEqual(expect.objectContaining({ proof: expect.objectContaining({ verifiedRewrites: 1 }) }));
  });

  it("credits only the first matching production and refuses a rewrite from the copy", () => {
    const base = sessionState();
    const original = uuid(71);
    const copy = uuid(72);
    base.corrections[uuid(42)] = correction(uuid(42), copy, {
      sentences: base.corrections[uuid(41)]?.sentences ?? [],
    });
    const ev = eventWriter();
    const submission = { sessionId: SESSION, text: words("scritto", 70), composeMs: 120000 };
    const { payload, nextState } = plan(base, [
      ev("production_submitted", iso("09:09:00"), { ...submission, productionId: original }),
      ev("production_submitted", iso("09:09:10"), { ...submission, productionId: copy }),
      ev("rewrite_submitted", iso("09:10:00"), { correctionId: uuid(42), sentenceIndex: 0, text: "Io sono andato al mercato ieri" }),
    ]);
    expect(payload.xp.filter((line) => line.reason === "production.corrected").map((line) => line.meta.ref)).toEqual([original]);
    expect(payload.productions.map((row) => row.task.initialSimilarity)).toEqual([0, 1]);
    expect(payload.rewrites).toEqual([expect.objectContaining({ accepted: false })]);
    expect(nextState.productions[copy]?.feedbackEligible).toBe(false);
  });

  it("does not grant derived XP when an old correction has no stored originality proof", () => {
    const base = sessionState();
    base.productions[uuid(71)] = {
      id: uuid(71), sessionId: SESSION, language: "it", text: words("scritto", 70), day: TODAY,
      late: true, settled: true, correctionDeferred: false, clientEventId: uuid(72), creditExpired: true,
    };
    const event = eventWriter()("rewrite_submitted", iso("09:10:00"), {
      correctionId: uuid(41), sentenceIndex: 0, text: "Io sono andato al mercato ieri",
    });
    const { payload } = plan(base, [event]);
    expect(payload.rewrites).toEqual([expect.objectContaining({ accepted: false })]);
    expect(reasons(payload)).not.toContain("rewrite.sentence");
  });

  it("can be cut in two batches, and replayed, with the same outcome", () => {
    const events = fullSession();
    const whole = plan(sessionState(), events);
    const first = plan(sessionState(), events.slice(0, 8));
    const second = plan(first.nextState, events.slice(8));
    expect(second.nextState.sessions[SESSION]?.status).toBe("completed");
    expect(second.nextState.learningDays).toEqual(whole.nextState.learningDays);
    expect(xpOf(first.payload) + xpOf(second.payload)).toBe(xpOf(whole.payload));
    expect(plan(second.nextState, events).payload).toEqual(expect.objectContaining({ xp: [], reviews: [], sessions: [] }));
  });

  it("does not complete the session without the rewrite once the correction found errors", () => {
    const events = fullSession().filter((e) => e.kind !== "rewrite_submitted");
    const { payload } = plan(sessionState(), events);
    expect(payload.sessions[0]?.status).toBe("started");
    expect(reasons(payload)).not.toContain("session.complete");
    expect(payload.learning_days[0]?.cause).toBe("work");
  });

  it("waits for the correction, then pays the production when it is in the state", () => {
    const waiting = sessionState();
    waiting.corrections = {};
    const events = fullSession().filter((e) => e.kind !== "rewrite_submitted");
    const first = plan(waiting, events);
    expect(reasons(first.payload)).not.toContain("production.corrected");
    expect(first.payload.sessions[0]?.status).toBe("started");
    const arrived = structuredClone(first.nextState);
    arrived.corrections[uuid(41)] = correction(uuid(41), uuid(71), { sentences: [] });
    const later = plan(arrived, [], new Date(NOW.getTime() + HOUR_MS));
    expect(reasons(later.payload).sort()).toEqual(["production.corrected", "session.complete"]);
    expect(later.payload.sessions[0]?.status).toBe("completed");
  });
});

describe("planIngest: the farm profile (j2-jeu-xp-serie.md §10)", () => {
  it("earns about 8 XP in a 45 minute attempt to game the scale, and does not even validate the day", () => {
    const source = words("testo", 300);
    const cards: Record<string, ReturnType<typeof card>> = {};
    const add = (id: string, extra = {}) => (cards[id] = card(id, extra));
    for (let i = 0; i < 60; i++) add(uuid(1000 + i), { dueAt: "2026-11-20T10:00:00.000Z" }); // replayed cards, not due
    for (let i = 0; i < 20; i++) add(uuid(1100 + i)); // due, answered in under 600 ms
    for (let i = 0; i < 20; i++) add(uuid(1200 + i)); // due, guessed at 650 ms
    const items = Object.fromEntries([61, 62, 63].map((n) => [uuid(n), item(uuid(n))]));
    const productions = [uuid(71), uuid(72), uuid(73)];
    const state = emptyState({
      cards,
      texts: { [TEXT]: text({ body: source }) },
      items: { ...items, ...Object.fromEntries([51, 52, 53].map((n) => [uuid(n), item(uuid(n))])) },
      sessions: { [SESSION]: session({ format: 30, wakeCardIds: Object.keys(cards), readingItemIds: [uuid(51), uuid(52), uuid(53)], workshopItemIds: Object.keys(items) }) },
      corrections: Object.fromEntries(productions.map((p, i) => [uuid(80 + i), correction(uuid(80 + i), p)])),
    });
    const ev = eventWriter();
    let t = Date.parse(iso("08:00:00"));
    const next = () => new Date((t += 4000)).toISOString();
    const events: RawEvent[] = [ev("session_started", next(), { sessionId: SESSION })];
    for (let i = 0; i < 60; i++) events.push(review(ev, uuid(1000 + i), next()));
    for (let i = 0; i < 20; i++) events.push(review(ev, uuid(1100 + i), next(), "ok", 300));
    for (let i = 0; i < 20; i++) events.push(review(ev, uuid(1200 + i), next(), i < 5 ? "ok" : "no", 650));
    for (let pass = 0; pass < 6; pass++) {
      events.push(ev("reading_progress", next(), { sessionId: SESSION, textId: TEXT, ratio: 0 }));
      for (const n of [51, 52, 53]) events.push(ev("comprehension_answer", next(), { sessionId: SESSION, itemId: uuid(n), answer: "a" }));
      events.push(ev("reading_progress", new Date(t + 20_000).toISOString(), { sessionId: SESSION, textId: TEXT, ratio: 1 }));
      t += 20_000;
    }
    productions.forEach((p) => events.push(ev("production_submitted", next(), { sessionId: SESSION, productionId: p, text: source, composeMs: 1000 })));
    // Workshop: first item right at the first try (2), second after a wrong one (1), third wrong twice; every item replayed.
    const focus = (n: number, tryNo: number, answer: string) => ev("focus_attempt", next(), { sessionId: SESSION, itemId: uuid(n), try: tryNo, answer, shownAt: new Date(t - 2000).toISOString() });
    events.push(focus(61, 1, "a"), focus(62, 1, "b"), focus(62, 2, "a"), focus(63, 1, "b"), focus(63, 2, "b"));
    events.push(focus(61, 1, "a"), focus(62, 1, "a"), focus(63, 1, "a"));

    const now = new Date(t + 3600_000);
    const { payload, report, rejected } = plan(state, events, now);
    expect(rejected).toEqual([]);
    expect(xpOf(payload)).toBe(8); // 5 guessed recognitions + 2 + 1 in the workshop
    expect(reasons(payload).sort()).toEqual(["focus.first_try", "focus.second_try", ...Array(5).fill("review.recognition")].sort());
    const zeroed = report.zeroed.map((z) => z.reason);
    expect(zeroed.filter((r) => r === "not_due")).toHaveLength(60);
    expect(zeroed.filter((r) => r === "too_fast")).toHaveLength(20);
    expect(zeroed.filter((r) => r === "too_similar")).toHaveLength(3);
    expect(zeroed.filter((r) => r === "already_counted_today")).toHaveLength(3);
    expect(payload.learning_days).toEqual([expect.objectContaining({ xp_verified: 8, validated: false, cause: "none" })]);
    expect(payload.sessions.every((row) => row.status !== "completed")).toBe(true);
    expect(reasons(payload)).not.toContain("session.complete");
    expect(reasons(payload)).not.toContain("reading.understood");
    expect(reasons(payload)).not.toContain("production.corrected");
  });
});

describe("planIngest: the streak across batches", () => {
  it("recomputes the streak from the whole journal and hands out the freezes of Monday", () => {
    const rows = Object.fromEntries(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"].map((day) => [day, { day, timeZone: "Europe/Paris", xpVerified: 60, validated: true, cause: "work", firstActivityAt: `${day}T09:00:00.000Z` }]));
    const { payload, report } = plan(emptyState({ cards: { [uuid(31)]: card(uuid(31)) }, learningDays: rows }), [review(eventWriter(), uuid(31), "2026-11-09T09:00:10.000Z")], new Date("2026-11-09T12:00:00Z"));
    // Monday 9 November, 7 validated days behind: the week goal (375 XP) is met: a freeze is earned.
    expect(payload.streak).toMatchObject({ current: 7, best: 7, freezes: 2, last_day: "2026-11-08", freezes_granted_through: "2026-11-09" });
    expect(report.streakEvents).toEqual([{ kind: "freeze_granted", day: "2026-11-09", source: "earned" }]);
  });

  it("uses the settings history: a rest day is neutral", () => {
    const rows = Object.fromEntries(["2026-11-09", "2026-11-10"].map((day) => [day, { day, timeZone: "Europe/Paris", xpVerified: 60, validated: true, cause: "work", firstActivityAt: `${day}T09:00:00.000Z` }]));
    const changes = [{ key: "streak.restDays" as const, value: [3], effectiveDay: "2026-11-01", changedAt: "2026-11-01T00:00:00.000Z" }];
    const s = emptyState({ cards: { [uuid(31)]: card(uuid(31)) }, learningDays: rows, settingChanges: changes });
    const { payload } = plan(s, [review(eventWriter(), uuid(31), "2026-11-12T09:00:10.000Z")], new Date("2026-11-12T10:00:00Z"));
    // Wednesday the 11th is a rest day: the series goes on without a freeze.
    expect(payload.streak).toMatchObject({ freezes: 1 });
  });
});

describe("planIngest: units", () => {
  const unitState = (extra: Partial<IngestState> = {}) => emptyState({ units: { [UNIT_ID]: unit() }, ...extra });
  const base = { unitId: UNIT_ID, unitVersion: UNIT_VERSION };
  const at = (seconds: number) => new Date(Date.parse(iso("09:00:00")) + seconds * 1000).toISOString();
  const attempt = (ev: ReturnType<typeof eventWriter>, seconds: number, itemId: string, answer = "a", tryNo = 1, lesson = "l1") =>
    ev("unit_item_attempt", at(seconds), { ...base, lesson, itemId, try: tryNo, answer, shownAt: at(seconds - 2) });
  const step = (ev: ReturnType<typeof eventWriter>, seconds: number, lesson: string, name: string) => ev("unit_step_completed", at(seconds), { ...base, lesson, step: name });
  const test = (ev: ReturnType<typeof eventWriter>, seconds: number, right: number, attemptId = uuid(700)) =>
    ev("unit_test_submitted", at(seconds), { ...base, attemptId, startedAt: at(seconds - 60), answers: Array.from({ length: 10 }, (_, i) => ({ itemId: `q${i + 1}`, answer: i < right ? "a" : "b" })) });

  it("pays focus.first_try (2 XP) for an item right at the first try and writes an attempt row without session", () => {
    const ev = eventWriter();
    const { payload, rejected } = plan(unitState(), [attempt(ev, 10, "q1")]);
    expect(rejected).toEqual([]);
    expect(payload.attempts).toEqual([expect.objectContaining({
      session_id: null, language: "it", step: "unit", exercise_kind: "unit_mcq", correct: true, duration_ms: 2000,
      answer: { value: "a", try: 1, unitId: UNIT_ID, unitVersion: UNIT_VERSION, lesson: "l1", itemId: "q1" },
    })]);
    expect(payload.attempts[0]?.exercise_ref).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.xp).toEqual([expect.objectContaining({ reason: "focus.first_try", amount: 2, rule_version: "j5.1", source: { kind: "attempt", client_event_id: payload.attempts[0]?.client_event_id } })]);
    expect(payload.unit_progress).toEqual([{ unit_id: UNIT_ID, language: "it", version: UNIT_VERSION, steps: {}, best_score: null, test_attempts: 0, passed_at: null, passed_version: null }]);
  });

  it("pays focus.second_try (1 XP) after a wrong first try, nothing at the third", () => {
    const ev = eventWriter();
    const { payload } = plan(unitState(), [attempt(ev, 10, "q1", "b"), attempt(ev, 20, "q1", "a", 2), attempt(ev, 30, "q2", "b"), attempt(ev, 40, "q2", "b", 2), attempt(ev, 50, "q2", "a", 3)]);
    expect(payload.xp.map((line) => [line.reason, line.amount])).toEqual([["focus.second_try", 1]]);
    expect(payload.attempts.map((row) => row.correct)).toEqual([false, true, false, false, true]);
  });

  it("counts the try on the server: a right answer sent as try 1 after a wrong one earns 1 XP, not 2", () => {
    const ev = eventWriter();
    const { payload } = plan(unitState(), [attempt(ev, 10, "q1", "b"), attempt(ev, 20, "q1", "a", 1)]);
    expect(payload.xp.map((line) => [line.reason, line.amount])).toEqual([["focus.second_try", 1]]);
  });

  it("pays an item once per account: a repeat, the same day or later, earns 0 with already_earned", () => {
    const ev = eventWriter();
    const first = plan(unitState(), [attempt(ev, 10, "q1")]);
    const again = plan(first.nextState, [attempt(ev, 20, "q1")]);
    expect(again.payload.xp).toEqual([]);
    expect(again.report.zeroed).toEqual([{ clientEventId: again.payload.attempts[0]?.client_event_id, reason: "already_earned" }]);
    expect(again.payload.attempts[0]?.result).toMatchObject({ xpReason: "already_earned" });
    const known = unitState({ unitAttempts: { [UNIT_ID]: [{ lesson: "l2", itemId: "q1", try: 1, correct: true, occurredAt: "2026-11-01T10:00:00.000Z", version: "aaaaaaaaaaaa" }] } });
    expect(plan(known, [attempt(eventWriter(), 10, "q1")]).payload.xp).toEqual([]);
  });

  it("caps the items at 20 XP per (unit, lesson) and shares the 40 XP of focus a day with the sessions", () => {
    const ev = eventWriter();
    const l2 = Array.from({ length: 12 }, (_, i) => attempt(ev, 10 + i * 10, `q${9 + i}`, "a", 1, "l2"));
    const { payload, report } = plan(unitState(), [...l2, attempt(ev, 200, "q5")]);
    expect(xpOf(payload)).toBe(22);
    expect(report.zeroed.filter((z) => z.reason === "cap_reached")).toHaveLength(2);
    const busy = unitState({ days: { [TODAY]: { xpByReason: { "focus.first_try": 37 }, reviewSuccesses: 0, newCards: 0, readingTexts: 0, rewards: {}, focusBySession: { [SESSION]: 20 }, rewardsByCorrection: {}, counted: [] } } });
    const ev2 = eventWriter();
    const capped = plan(busy, [attempt(ev2, 10, "q1"), attempt(ev2, 20, "q2"), attempt(ev2, 30, "q3")]);
    expect(xpOf(capped.payload)).toBe(3);
    expect(capped.report.zeroed.map((z) => z.reason)).toEqual(["cap_reached"]);
  });

  it("passes the test at 8/10 without any step done: 25 XP, a unit_test row, passed_at and the best score", () => {
    const ev = eventWriter();
    const { payload, rejected } = plan(unitState(), [test(ev, 100, 8)]);
    expect(rejected).toEqual([]);
    expect(payload.unit_tests).toEqual([{ id: uuid(700), unit_id: UNIT_ID, version: UNIT_VERSION, client_event_id: expect.any(String), score: 8, passed: true, missed: ["q9", "q10"] }]);
    expect(payload.xp).toEqual([expect.objectContaining({ reason: "unit.complete", amount: 25, source: null, language: "it", meta: expect.objectContaining({ ref: UNIT_ID, volet: null }) })]);
    expect(payload.unit_progress[0]).toMatchObject({ best_score: 8, test_attempts: 1, passed_at: at(100), passed_version: UNIT_VERSION, steps: {} });
    expect(payload.learning_days[0]).toMatchObject({ xp_verified: 25, validated: true, cause: "work" });
  });

  it("fails at 7/10, then a second pass earns nothing and keeps the first passed_at; items after a pass earn nothing", () => {
    const ev = eventWriter();
    const failed = plan(unitState(), [test(ev, 100, 7, uuid(701))]);
    expect(failed.payload.xp).toEqual([]);
    expect(failed.payload.unit_progress[0]).toMatchObject({ best_score: 7, test_attempts: 1, passed_at: null });
    const passed = plan(failed.nextState, [test(ev, 200, 9, uuid(702))]);
    expect(xpOf(passed.payload)).toBe(25);
    const again = plan(passed.nextState, [test(ev, 300, 10, uuid(703)), attempt(ev, 400, "q1")]);
    expect(again.payload.xp).toEqual([]);
    expect(again.report.zeroed.map((z) => z.reason)).toEqual(["already_earned", "already_earned"]);
    expect(again.payload.unit_progress[0]).toMatchObject({ best_score: 10, test_attempts: 3, passed_at: at(200) });
  });

  it("caps unit.complete at 2 units a learning day: the third earns 0 with cap_reached but is passed", () => {
    const day = { xpByReason: { "unit.complete": 50 }, reviewSuccesses: 0, newCards: 0, readingTexts: 0, rewards: { "unit.complete": 2 }, focusBySession: {}, rewardsByCorrection: {}, counted: [] };
    const { payload, report } = plan(unitState({ days: { [TODAY]: day } }), [test(eventWriter(), 100, 10)]);
    expect(payload.xp).toEqual([]);
    expect(report.zeroed.map((z) => z.reason)).toEqual(["cap_reached"]);
    expect(payload.unit_progress[0]?.passed_at).toBe(at(100));
  });

  it("refuses an unknown or unpublished unit (unless drafts are allowed), another version and an unknown item", () => {
    const ev = eventWriter();
    const other = ev("unit_item_attempt", at(10), { ...base, unitId: "it-a1-02-altro", lesson: "l1", itemId: "q1", try: 1, answer: "a", shownAt: at(8) });
    const oldVersion = ev("unit_item_attempt", at(11), { ...base, unitVersion: "ffffffffffff", lesson: "l1", itemId: "q1", try: 1, answer: "a", shownAt: at(9) });
    const outOfLesson = attempt(ev, 12, "q9", "a", 1, "l1");
    const missing = attempt(ev, 13, "q99");
    const testOutside = ev("unit_test_submitted", at(14), { ...base, attemptId: uuid(710), startedAt: at(1), answers: [{ itemId: "q11", answer: "a" }] });
    const testTwice = ev("unit_test_submitted", at(15), { ...base, attemptId: uuid(711), startedAt: at(1), answers: [{ itemId: "q1", answer: "a" }, { itemId: "q1", answer: "a" }] });
    const { payload, rejected } = plan(unitState(), [other, oldVersion, outOfLesson, missing, testOutside, testTwice]);
    expect(rejected.map((r) => r.reason)).toEqual(["unknown_unit", "unit_version_mismatch", "unknown_item", "unknown_item", "unknown_item", "invalid_payload"]);
    expect(isEmptyIngestPayload(payload)).toBe(true);

    const draft = emptyState({ units: { [UNIT_ID]: unit({ status: "reviewed" }) } });
    const event = attempt(eventWriter(), 10, "q1");
    expect(plan(draft, [event]).rejected).toEqual([{ clientEventId: event.clientEventId, reason: "unknown_unit" }]);
    expect(planIngest(draft, [event], NOW, { allowDrafts: true }).rejected).toEqual([]);
  });

  it("refuses a test attempt id already recorded, or used twice in the batch (the first by instant is kept)", () => {
    const ev = eventWriter();
    expect(plan(unitState({ unitTestIds: [uuid(700)] }), [test(ev, 100, 8)]).rejected.map((r) => r.reason)).toEqual(["duplicate_test_attempt"]);
    const late = test(ev, 300, 8, uuid(720));
    const early = test(ev, 200, 9, uuid(720));
    const { payload, rejected } = plan(unitState(), [late, early]);
    expect(rejected).toEqual([{ clientEventId: late.clientEventId, reason: "duplicate_test_attempt" }]);
    expect(payload.unit_tests.map((row) => row.score)).toEqual([9]);
  });

  it("records a step only when the attempts prove it (state + batch), else step_not_proven; no XP", () => {
    const ev = eventWriter();
    const unproven = step(ev, 5, "l1", "dialogue");
    const first = plan(unitState(), [unproven]);
    expect(first.rejected).toEqual([{ clientEventId: unproven.clientEventId, reason: "step_not_proven" }]);
    expect(first.payload.unit_progress).toEqual([]);
    expect(first.payload.device_cursors).toEqual([]);
    const { payload, rejected } = plan(unitState(), [attempt(ev, 10, "q1", "b"), attempt(ev, 20, "q2", "b"), step(ev, 30, "l1", "dialogue"), attempt(ev, 40, "q5"), attempt(ev, 50, "q6", "b"), step(ev, 60, "l1", "exercises")]);
    expect(rejected.map((r) => r.reason)).toEqual(["step_not_proven"]);
    expect(payload.unit_progress[0]?.steps).toEqual({ "l1:dialogue": at(30) });
    const known = ["q5", "q6", "q7"].map((itemId) => ({ lesson: "l1" as const, itemId, try: 1, correct: true, occurredAt: at(1), version: UNIT_VERSION }));
    const ev2 = eventWriter(300);
    const later = plan(unitState({ unitAttempts: { [UNIT_ID]: known } }), [attempt(ev2, 70, "q8", "b"), step(ev2, 80, "l1", "exercises")]);
    expect(later.rejected).toEqual([]);
    expect(later.payload.unit_progress[0]?.steps).toEqual({ "l1:exercises": at(80) });
    expect(later.payload.xp).toEqual([]);
  });

  it("turns the key phrases into chunk cards at l1:key_phrases, once, skipping fronts the learner has", () => {
    const ev = eventWriter();
    const s = unitState({ cardFronts: ["it|chunk|frase 6"] });
    const { payload, nextState } = plan(s, [attempt(ev, 10, "q3"), attempt(ev, 20, "q4"), step(ev, 30, "l1", "key_phrases")]);
    expect(payload.cards_created).toHaveLength(5);
    expect(payload.cards_created[0]).toMatchObject({ language: "it", kind: "chunk", front: "Frase 1", back: "Phrase 1 (fr)", back_language: "fr", context: "Battuta 1", source: "unit", state: "new", payload: { unitId: UNIT_ID, keyPhraseId: "k1" } });
    expect(payload.cards_created[2]?.context).toBeNull();
    expect(payload.cards_created[0]?.due_at).toBe("2026-11-13T03:00:00.000Z");
    expect(payload.unit_progress[0]?.steps).toEqual({ "l1:key_phrases": at(30) });
    const again = plan(nextState, [step(ev, 40, "l1", "key_phrases")]);
    expect(again.rejected).toEqual([]);
    expect(again.payload.cards_created).toEqual([]);
    const ev2 = eventWriter(500);
    const english = plan(unitState({ profile: { ...emptyState().profile, explanationLanguage: "en" } }), [attempt(ev2, 10, "q3"), attempt(ev2, 20, "q4"), step(ev2, 30, "l1", "key_phrases")]);
    expect(english.payload.cards_created[0]).toMatchObject({ back: "Phrase 1 (en)", back_language: "en" });
  });

  it("records the steps of a writing unit and creates no key-phrase card", () => {
    const ev = eventWriter();
    const writing = { unitId: SCRIPT_UNIT_ID, unitVersion: UNIT_VERSION };
    const s = emptyState({ units: { [SCRIPT_UNIT_ID]: scriptUnit() } });
    const { payload, rejected } = plan(s, [
      ev("unit_item_attempt", at(10), { ...writing, lesson: "l1", itemId: "q1", try: 1, answer: "a", shownAt: at(8) }),
      ev("unit_item_attempt", at(20), { ...writing, lesson: "l1", itemId: "q2", try: 1, answer: "a", shownAt: at(18) }),
      ev("unit_step_completed", at(30), { ...writing, lesson: "l1", step: "letters" }),
      ev("unit_step_completed", at(40), { ...writing, lesson: "l1", step: "key_phrases" }),
    ]);
    expect(rejected.map((r) => r.reason)).toEqual(["step_not_proven"]);
    expect(payload.cards_created).toEqual([]);
    expect(payload.unit_progress[0]?.steps).toEqual({ "l1:letters": at(30) });
  });

  describe("the bilan (unit kind assessment)", () => {
    const bilan = { unitId: ASSESSMENT_UNIT_ID, unitVersion: UNIT_VERSION };
    const bilanIds = assessmentUnit().test.itemIds;
    const bilanState = () => emptyState({ units: { [ASSESSMENT_UNIT_ID]: assessmentUnit() } });
    const submit = (ev: ReturnType<typeof eventWriter>, seconds: number, right: number, attemptId = uuid(800)) =>
      ev("unit_test_submitted", at(seconds), { ...bilan, attemptId, startedAt: at(seconds - 60), answers: bilanIds.map((itemId, i) => ({ itemId, answer: i < right ? "a" : "b" })) });

    it("passes at 8/10: passed_at, a unit_test row and 25 XP of unit.complete", () => {
      const { payload, rejected } = plan(bilanState(), [submit(eventWriter(), 100, 8)]);
      expect(rejected).toEqual([]);
      expect(payload.unit_tests).toEqual([expect.objectContaining({ unit_id: ASSESSMENT_UNIT_ID, score: 8, passed: true, missed: bilanIds.slice(8) })]);
      expect(payload.xp).toEqual([expect.objectContaining({ reason: "unit.complete", amount: 25, meta: expect.objectContaining({ ref: ASSESSMENT_UNIT_ID }) })]);
      expect(payload.unit_progress[0]).toMatchObject({ unit_id: ASSESSMENT_UNIT_ID, best_score: 8, passed_at: at(100), passed_version: UNIT_VERSION });
      expect(payload.cards_created).toEqual([]);
    });

    it("does not pass at 7/10: no passed_at, no XP", () => {
      const { payload } = plan(bilanState(), [submit(eventWriter(), 100, 7)]);
      expect(payload.xp).toEqual([]);
      expect(payload.unit_progress[0]).toMatchObject({ best_score: 7, test_attempts: 1, passed_at: null });
    });

    it("pays nothing for a second pass and keeps the first passed_at", () => {
      const ev = eventWriter();
      const first = plan(bilanState(), [submit(ev, 100, 9, uuid(801))]);
      const again = plan(first.nextState, [submit(ev, 200, 10, uuid(802))]);
      expect(again.payload.xp).toEqual([]);
      expect(again.report.zeroed.map((z) => z.reason)).toEqual(["already_earned"]);
      expect(again.payload.unit_progress[0]).toMatchObject({ best_score: 10, test_attempts: 2, passed_at: at(100) });
    });

    it("refuses a unit_item_attempt on an item of the bilan (it belongs to no step)", () => {
      const event = eventWriter()("unit_item_attempt", at(10), { ...bilan, lesson: "l1", itemId: bilanIds[0], try: 1, answer: "a", shownAt: at(8) });
      const { payload, rejected } = plan(bilanState(), [event]);
      expect(rejected).toEqual([{ clientEventId: event.clientEventId, reason: "unknown_item" }]);
      expect(isEmptyIngestPayload(payload)).toBe(true);
    });
  });

  it("writes nothing for a replay of unit events already ingested", () => {
    const ev = eventWriter();
    const events = [attempt(ev, 10, "q1"), test(ev, 100, 8)];
    const first = plan(unitState(), events);
    const replay = plan(first.nextState, events);
    expect(isEmptyIngestPayload(replay.payload)).toBe(true);
    expect(replay.report.duplicates).toHaveLength(2);
  });
});
