import { describe, expect, it } from "vitest";
import { countProvenLemmas, loadProgressObservation, observeReading, readObservationTexts } from "./progress-observation";
import { tableFake } from "./table-fake";

const userId = "00000000-0000-4000-8000-000000000001";
const otherUser = "00000000-0000-4000-8000-000000000002";
const fromDay = "2026-11-20";
const throughDay = "2026-11-26";
const through = "2026-11-26T12:00:00Z";

describe("the progress observation", () => {
  it("keeps the first accepted answers and one observation per support", () => {
    const texts = ["Un texte.", "Un  texte.", "Deux.", "Trois.", "Quatre.", "Cinq.", "Six."]
      .map((body, index) => ({ id: String(index), body, level_band: "A2", new_words: [] }));
    const sessions = texts.map(({ id }, index) => ({
      id, textId: id, day: `2026-11-${20 + Math.floor(index / 2)}`, itemIds: ["a", "b", "c"].map((item) => id + item),
    }));
    const items = sessions.flatMap(({ textId, itemIds }) => itemIds.map((id) => ({ id, text_id: textId })));
    const attempts = items.map(({ id, text_id }, index) => ({
      id: index + 1, exercise_ref: id, session_id: text_id, correct: text_id !== "0", client_event_id: id,
    }));
    const retry = { ...attempts[0]!, id: 99, correct: true, client_event_id: "retry" };
    const evidence = { sessions, items, attempts: [retry, ...attempts, ...attempts], reviews: [], cards: [], rewardDays: new Map() };
    expect(observeReading(evidence, texts)).toEqual({
      shortSessions: 0, incompleteSupports: 0,
      bands: [{ level: "A2", supports: 6, lotSize: 5, passed: 4, days: 3, meetsThreshold: true }],
    });
    expect(observeReading({ ...evidence, attempts: attempts.filter(({ exercise_ref }) => !["0c", "3c"].includes(exercise_ref)) }, texts))
      .toMatchObject({ incompleteSupports: 2, bands: [{ lotSize: 4, meetsThreshold: false }] });
    expect(observeReading({ ...evidence, sessions: sessions.map((session) => ({ ...session, day: fromDay })) }, texts))
      .toMatchObject({ bands: [{ meetsThreshold: false, days: 1 }] });
    expect(observeReading({ ...evidence, items: items.filter(({ id }) => !id.endsWith("c")) }, texts))
      .toMatchObject({ shortSessions: 7, bands: [] });
  });

  it("requires distinct recall days, sufficient FSRS stability and an unambiguous lemma", () => {
    const proof = { lemma: "mercato", definition: "Luogo di vendita.", stability: 21, days: [fromDay] };
    expect(countProvenLemmas([proof, proof])).toBe(0);
    expect(countProvenLemmas([proof, { ...proof, days: [throughDay], stability: 5 }])).toBe(1);
    expect(countProvenLemmas([proof, { ...proof, days: [throughDay], definition: "Insieme delle vendite." }])).toBe(0);
    expect(countProvenLemmas([{ ...proof, stability: 20, days: [fromDay, throughDay] }])).toBe(0);
  });

  it("scopes journal queries to the account, language and cutoff", async () => {
    const attempt = { id: 1, user_id: userId, language: "it", step: "reading", exercise_kind: "mcq", received_at: through };
    const reward = { user_id: userId, language: "it", day: fromDay, amount: 2, reason: "review.production", created_at: through };
    const review = { id: 1, user_id: userId, card_id: "card", origin: "fsrs", mode: "production", rating: 3, elapsed_days: 2, created_at: through };
    const card = { id: "card", user_id: userId, language: "it", kind: "word", source: "reader", deleted_at: null };
    const { client } = tableFake({
      session: [],
      attempt: [attempt, { ...attempt, id: 2, user_id: otherUser }, { ...attempt, id: 3, language: "ru" },
        { ...attempt, id: 4, received_at: "2026-11-26T13:00:00Z" }],
      xp_ledger: [{ ...reward, review_log_id: 1 }, { ...reward, review_log_id: 2 }, { ...reward, review_log_id: 3 },
        { ...reward, review_log_id: 4, user_id: otherUser }, { ...reward, review_log_id: 5, language: "ru" }],
      review_log: [review, { ...review, id: 2, elapsed_days: 0 }, { ...review, id: 3, rating: 2 },
        { ...review, id: 4 }, { ...review, id: 5 }],
      card: [card, { ...card, user_id: otherUser }, { ...card, language: "ru" }, { ...card, deleted_at: through }],
      text: [{ id: "it", language: "it", status: "published" }, { id: "ru", language: "ru", status: "published" },
        { id: "draft", language: "it", status: "checked" }],
    });
    const evidence = await loadProgressObservation(client, { userId, language: "it", fromDay, throughDay, through });
    expect(evidence.attempts).toEqual([attempt]);
    expect(evidence.reviews).toEqual([review]);
    expect(evidence.cards).toEqual([card]);
    expect(await readObservationTexts(client, "it", ["it", "ru", "draft"])).toMatchObject([{ id: "it" }]);
  });
});
