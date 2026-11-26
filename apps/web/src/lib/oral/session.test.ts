import { clientEventSchema } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { chunksOf, dictationXp, oralAttemptEvent, repeatXp, summarize, type SaidResult } from "./session";
import type { OralPacketSentence } from "./select-oral";

const sentence: OralPacketSentence = { id: "it-a1-01-saluer#l1", unitVersion: "0123456789ab", text: "Buongiorno, come va?", translation: "Bonjour, ça va ?", audio: "/unit-audio/x.mp3", words: 3 };

/** What the offline queue does to an event before it is stored. */
function parsed(event: ReturnType<typeof oralAttemptEvent>, occurredAt: number) {
  return clientEventSchema.safeParse({
    kind: event.kind,
    payload: { ...event.payload, tz: "Europe/Paris", deviceId: crypto.randomUUID(), seq: 1 },
    clientEventId: crypto.randomUUID(),
    occurredAt: new Date(occurredAt).toISOString(),
  });
}

describe("XP estimates", () => {
  it("pays a repetition from 60 % and a dictation 1 from 80 %, 2 from 95 %", () => {
    expect([0.59, 0.6, 1].map(repeatXp)).toEqual([0, 1, 1]);
    expect([0.79, 0.8, 0.94, 0.95].map(dictationXp)).toEqual([0, 1, 1, 2]);
  });
});

describe("oralAttemptEvent", () => {
  it("builds events the server schema accepts, for each activity", () => {
    const now = Date.now();
    const base = { sentence, shownAt: now - 5000, startedAt: now - 3000, endedAt: now - 10 };
    const events = [
      oralAttemptEvent({ ...base, activity: "anticipation", answer: "", recognizer: "none", selfRating: "almost" }),
      oralAttemptEvent({ ...base, activity: "shadowing", answer: "buongiorno come va", recognizer: "device", selfRating: null }),
      oralAttemptEvent({ ...base, activity: "shadowing", answer: "", recognizer: "none", selfRating: "not_yet" }),
      oralAttemptEvent({ ...base, activity: "dictation", answer: "Buongiorno, come va?", recognizer: "none", selfRating: null }),
    ];
    for (const event of events) expect(parsed(event, now).success, JSON.stringify(event)).toBe(true);
  });

  it("keeps the instants in order even when the learner taps at once", () => {
    const now = Date.now();
    const event = oralAttemptEvent({ sentence, activity: "anticipation", answer: "", recognizer: "none", selfRating: "got_it", shownAt: now, startedAt: now + 50, endedAt: now });
    expect(parsed(event, now + 1).success).toBe(true);
    const { shownAt, startedAt, endedAt } = event.payload as { shownAt: string; startedAt: string; endedAt: string };
    expect(Date.parse(shownAt)).toBeLessThanOrEqual(Date.parse(startedAt));
    expect(Date.parse(startedAt)).toBeLessThan(Date.parse(endedAt));
  });

  it("cuts a long transcript to the length the schema accepts and carries no score", () => {
    const now = Date.now();
    const event = oralAttemptEvent({ sentence, activity: "shadowing", answer: "a ".repeat(300), recognizer: "device", selfRating: null, shownAt: now - 2000, startedAt: now - 1000, endedAt: now - 5 });
    expect((event.payload as { answer: string }).answer).toHaveLength(200);
    expect(Object.keys(event.payload)).not.toEqual(expect.arrayContaining(["score", "xp", "ratio", "correct"]));
    expect(parsed(event, now).success).toBe(true);
  });
});

describe("summarize", () => {
  const said: SaidResult[] = [
    { anticipation: "got_it", repeat: { ratio: 0.8, passed: true, declared: false } },
    { anticipation: "not_yet", repeat: { ratio: 0.3, passed: false, declared: false } },
    { anticipation: "almost", repeat: { ratio: null, passed: true, declared: true } },
  ];

  it("counts the repetitions (a declared one has no share), the XP (a declared one pays nothing), the anticipation and what to review", () => {
    const summary = summarize(said, [1, 0.85, 0.5]);
    expect(summary.repeated).toEqual({ count: 3, passed: 1 });
    expect(summary.xp).toBe(1 + 2 + 1);
    expect(summary.anticipation).toEqual({ had: 1, total: 3 });
    expect(summary.dictation.count).toBe(3);
    expect(summary.dictation.average).toBeCloseTo(0.7833, 3);
    // The second sentence (not known, not repeated) and the third dictation.
    expect(summary.toReview).toBe(2);
  });

  it("copes with a series cut short", () => {
    expect(summarize([], [])).toEqual({ xp: 0, repeated: { count: 0, passed: 0 }, dictation: { count: 0, average: 0 }, anticipation: { had: 0, total: 0 }, toReview: 0 });
  });
});

describe("chunksOf", () => {
  it("cuts the sentence in two at a word without its closing punctuation, and gives nothing for a single word", () => {
    expect(chunksOf("Buongiorno, come sta oggi?")).toEqual(["Buongiorno, come", "sta oggi"]);
    expect(chunksOf("Ciao")).toBeNull();
  });
});
