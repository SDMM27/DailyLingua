import { fingerprint } from "@dailylingua/core";
import type { CardRow } from "@dailylingua/data";

/**
 * The options of a card served as a choice (`recognition`, `listening`): 4 meanings, the right one first drawn among
 * the others by a deterministic shuffle (seed = session id + card id), so a packet rebuilt later is the same packet.
 * The id of an option is the id of the card whose meaning it is (`j2-pr1-lot-w.md`, D5): the right option has the id
 * of the card itself.
 */

export const OPTION_COUNT = 4;

/** mulberry32: a small seeded generator, enough to shuffle four options. */
function seededRandom(seed: string): () => number {
  let state = Number.parseInt(fingerprint(seed).slice(0, 8), 16) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

const meaning = (card: Pick<CardRow, "back">): string | null => {
  const back = card.back?.trim();
  return back ? back : null;
};

/**
 * Four options for `card` (its own meaning and three others of the same language), or null when it cannot be served
 * as a choice: no meaning, or fewer than three other distinct meanings in `pool`.
 */
export function buildChoiceOptions(card: Pick<CardRow, "id" | "back">, pool: readonly Pick<CardRow, "id" | "back" | "language">[], language: string, seed: string): { options: { id: string; text: string }[]; correctOptionId: string } | null {
  const correct = meaning(card);
  if (correct === null) return null;
  const taken = new Set([correct.toLowerCase()]);
  const distractors: { id: string; text: string }[] = [];
  for (const other of [...pool].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const text = meaning(other);
    if (other.id === card.id || other.language !== language || text === null || taken.has(text.toLowerCase())) continue;
    taken.add(text.toLowerCase());
    distractors.push({ id: other.id, text });
  }
  if (distractors.length < OPTION_COUNT - 1) return null;
  const random = seededRandom(`${seed}:${card.id}`);
  const options = shuffled([{ id: card.id, text: correct }, ...shuffled(distractors, random).slice(0, OPTION_COUNT - 1)], random);
  return { options, correctOptionId: card.id };
}
