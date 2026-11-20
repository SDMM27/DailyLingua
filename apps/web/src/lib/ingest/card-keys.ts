import { cardRecallVariant } from "@dailylingua/core";
import type { CardRow } from "@dailylingua/data";
import type { ReviewMode } from "@dailylingua/schemas";

/**
 * The key of a card is the mode it was served in (`j2-pr1-lot-w.md`, D5). A card served in a packet keeps that mode; a
 * card never served gets the one `cardRecallVariant` of core gives from its stability. Pure.
 */

function isErrorCard(card: { payload?: unknown }): boolean {
  return (card.payload as { errorOfDay?: unknown } | null | undefined)?.errorOfDay === true;
}

/** Error cards store the faulty sentence on the front and accept only the passage corrections. */
export function cardAcceptList(card: Pick<CardRow, "front" | "payload">): string[] {
  const accept = (card.payload as { accept?: unknown } | null)?.accept;
  const extra = Array.isArray(accept) ? accept.filter((value): value is string => typeof value === "string" && value.length > 0) : [];
  return [...new Set(isErrorCard(card) ? extra : [card.front, ...extra])].slice(0, 50);
}

/** The mode a card is expected to be answered in: the served one, else the one its stability gives. */
export function expectedCardMode(card: Pick<CardRow, "stability" | "context"> & { payload?: unknown }, served: ReviewMode | undefined): ReviewMode {
  if (served !== undefined) return served;
  if (isErrorCard(card)) return "production";
  return cardRecallVariant({ stability: card.stability, hasContext: card.context !== null && card.context.trim().length > 0 }).mode;
}

export function correctionHighlight(card: Pick<CardRow, "context" | "front" | "payload">): string | null {
  return isErrorCard(card) && card.context && card.front.includes(card.context) ? card.context : null;
}

/** `recognition` and `listening` are answered by choosing an option whose id is the card id; `production` by typing. */
export function cardKeyForMode(card: Pick<CardRow, "id" | "front" | "payload">, mode: ReviewMode): { optionId: string | null; accept: string[] } {
  if (mode === "production") return { optionId: null, accept: cardAcceptList(card) };
  return { optionId: card.id, accept: [] };
}

/**
 * Events of kind `review_attempt` whose `mode` differs from the expected one are refused `invalid_payload` BEFORE
 * `planIngest` (otherwise a client could declare `production`, better paid, on a card served as a choice, and answer
 * with an option id). Events of cards the state does not know, events that are not review attempts, and replays of
 * events already ingested are left to `planIngest`.
 */
export function filterReviewModes(
  events: readonly unknown[],
  expectedModes: ReadonlyMap<string, ReviewMode>,
  knownEvents: Readonly<Record<string, string | null>>,
): { kept: unknown[]; rejected: { clientEventId: string; reason: "invalid_payload" }[] } {
  const kept: unknown[] = [];
  const rejected: { clientEventId: string; reason: "invalid_payload" }[] = [];
  for (const event of events) {
    const e = event as { clientEventId?: unknown; kind?: unknown; payload?: { cardId?: unknown; mode?: unknown; sessionId?: unknown } | null } | null;
    // For a named session the planner validates against that particular packet.
    const expected = e?.kind === "review_attempt" && e.payload?.sessionId === undefined && typeof e.payload?.cardId === "string" ? expectedModes.get(e.payload.cardId) : undefined;
    const known = typeof e?.clientEventId === "string" && Object.hasOwn(knownEvents, e.clientEventId);
    if (expected !== undefined && !known && e?.payload?.mode !== expected && typeof e?.clientEventId === "string") {
      rejected.push({ clientEventId: e.clientEventId, reason: "invalid_payload" });
    } else kept.push(event);
  }
  return { kept, rejected };
}
