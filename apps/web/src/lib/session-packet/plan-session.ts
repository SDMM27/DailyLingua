import { addDays, learningDay, localTime, planDay, type PlanCard, type WorkshopComposition } from "@dailylingua/core";
import type { CardRow, ItemRow, PacketTextRow, TextCandidate } from "@dailylingua/data";
import type { DateKey, ReviewMode, SessionFormat, SessionKind, StoredSessionPlan } from "@dailylingua/schemas";
import { expectedCardMode } from "@/lib/ingest/card-keys";
import { buildChoiceOptions } from "./options";

/**
 * The plan of the day the server stores in `session.plan` (`j2-pr1-lot-w.md` section 7): `planDay` of core decides the
 * Réveil and the steps, this module chooses the text, the items and the mode each card is served in. Pure: the
 * instant and everything read come in as parameters.
 */

/** Cards in a packet at most (`packetCardSchema` array bound). */
export const MAX_PACKET_CARDS = 120;
/** A packet holds the cards due through this many days after the learning day. */
export const DUE_AHEAD_DAYS = 2;

/** The candidate whose density is nearest 2, then the oldest, then by id (a deterministic pick). */
export function pickTextCandidate(candidates: readonly TextCandidate[]): TextCandidate | null {
  const ranked = [...candidates].sort((a, b) => Math.abs(a.density - 2) - Math.abs(b.density - 2) || (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0) || (a.id < b.id ? -1 : 1));
  return ranked[0] ?? null;
}

/** `count` reading items by position, one of them `listening_only` when the text has one (the others are not). */
export function pickReadingItems(items: readonly ItemRow[], count: number): ItemRow[] {
  if (count <= 0) return [];
  const reading = items.filter((item) => item.step === "reading").sort(byPosition);
  const listening = reading.find((item) => item.listeningOnly);
  const others = reading.filter((item) => !item.listeningOnly);
  const picked = listening ? [listening, ...others.slice(0, count - 1)] : others.slice(0, count);
  return picked.sort(byPosition);
}

export function pickWorkshopItems(items: readonly ItemRow[], composition: WorkshopComposition | number): ItemRow[] {
  const workshop = items.filter((item) => item.step === "workshop").sort(byPosition);
  const groupOf = (item: ItemRow) => (item.prompt as { group?: unknown } | null)?.group;
  if (typeof composition === "number") return workshop.slice(0, Math.max(0, composition));
  if (!workshop.some((item) => groupOf(item) === "word-choice")) return workshop.slice(0, composition.total);
  return [
    ["word-choice", composition.wordMcq],
    ["word-gap", composition.wordCloze],
    ["grammar-gap", composition.grammarCloze],
    ["grammar-transform", composition.grammarTransform],
  ].flatMap(([group, count]) => workshop.filter((item) => groupOf(item) === group).slice(0, Number(count)));
}

const byPosition = (a: ItemRow, b: ItemRow) => a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function toPlanCard(card: CardRow, rating: number | null): PlanCard {
  return {
    id: card.id,
    state: card.state as PlanCard["state"],
    dueAt: new Date(card.dueAt),
    stability: card.stability,
    lastReviewAt: card.lastReviewAt === null ? null : new Date(card.lastReviewAt),
    lastRatingYesterday: rating,
  };
}

export interface PlanTodayInput {
  now: Date;
  today: DateKey;
  timeZone: string;
  /** The format the enrollment asks for (a resumption may shorten it). */
  format: SessionFormat;
  /** The cards of the language (not deleted). */
  cards: readonly CardRow[];
  /** Reviews of the last days: the rating of the last one of yesterday marks a card to reconquer. */
  recentReviews: readonly { cardId: string; rating: number; reviewedAt: string }[];
  lastSessionDay: DateKey | null;
  completedShortSessions: number;
  newCardsToday: number;
  newCardsSuspendedThrough: DateKey | null;
  /** The text of the day with its items, or null (then the session is a review-only one: D6). */
  text: { text: PacketTextRow; items: ItemRow[] } | null;
}

export interface PlannedToday {
  kind: Extract<SessionKind, "daily" | "review_only">;
  format: SessionFormat;
  plan: StoredSessionPlan;
}

/** The mode a card is served in: the one its stability gives, a choice only if four options can be drawn. */
export function servedMode(card: CardRow, pool: readonly CardRow[], seed: string): ReviewMode {
  const mode = expectedCardMode(card, undefined);
  if (mode === "production") return mode;
  return buildChoiceOptions(card, pool, card.language, seed) ? mode : "production";
}

export function planToday(input: PlanTodayInput, sessionId: string): PlannedToday {
  const { now, today, timeZone, cards } = input;
  const kind = input.text ? "daily" : "review_only";
  const yesterday = addDays(today, -1);
  const ratings = new Map<string, { at: string; rating: number }>();
  for (const review of input.recentReviews) {
    if (learningDay(new Date(review.reviewedAt), timeZone) !== yesterday) continue;
    const known = ratings.get(review.cardId);
    if (!known || review.reviewedAt > known.at) ratings.set(review.cardId, { at: review.reviewedAt, rating: review.rating });
  }
  const dayPlan = planDay({
    format: input.format,
    kind,
    now,
    today,
    cards: cards.map((card) => toPlanCard(card, ratings.get(card.id)?.rating ?? null)),
    // The error of the day comes with the written correction (milestone 2, PR 3).
    errorItemId: null,
    lastSessionDay: input.lastSessionDay,
    completedShortSessions: input.completedShortSessions,
    newCardsToday: input.newCardsToday,
    newCardsSuspendedThrough: input.newCardsSuspendedThrough,
  });

  // The cards of the packet: the Réveil, then what falls due before the end of the day after tomorrow.
  const horizon = localTime(addDays(today, DUE_AHEAD_DAYS + 1), "04:00", timeZone).getTime();
  const inWake = new Set(dayPlan.wake.cardIds);
  const ahead = cards
    .filter((card) => !inWake.has(card.id) && card.state !== "new" && card.state !== "suspended" && card.state !== "known" && Date.parse(card.dueAt) < horizon)
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt) || (a.id < b.id ? -1 : 1));
  const byId = new Map(cards.map((card) => [card.id, card]));
  const servedIds = [...dayPlan.wake.cardIds, ...ahead.map((card) => card.id)].slice(0, MAX_PACKET_CARDS);
  const servedCards: Record<string, ReviewMode> = {};
  for (const id of servedIds) {
    const card = byId.get(id);
    if (card) servedCards[id] = servedMode(card, cards, sessionId);
  }

  const readingItems = input.text ? pickReadingItems(input.text.items, dayPlan.readingQuestions) : [];
  const workshopItems = input.text && dayPlan.workshop ? pickWorkshopItems(input.text.items, dayPlan.workshop) : [];
  const plan: StoredSessionPlan = {
    v: 1,
    steps: dayPlan.steps,
    requiredSteps: dayPlan.steps.filter((step) => step.required).map((step) => step.step),
    wake: { cardIds: dayPlan.wake.cardIds, newCardIds: dayPlan.wake.newCardIds, budgetMinutes: dayPlan.wake.budgetMinutes, errorItemId: dayPlan.wake.errorItemId },
    reading: { textId: input.text?.text.id ?? null, itemIds: readingItems.map((item) => item.id) },
    workshop: { itemIds: workshopItems.map((item) => item.id) },
    // "The whole text plus 180 words" is stored as null, the convention of `StateSession`.
    momentumWords: typeof dayPlan.momentumWords === "number" ? dayPlan.momentumWords : null,
    rewriteSentences: dayPlan.rewriteSentences,
    servedCards,
    resumption: dayPlan.resumption,
    newCardsSuspendedThrough: dayPlan.newCardsSuspendedThrough,
  };
  return { kind, format: dayPlan.format, plan };
}
