import { cardRecallVariant } from "@dailylingua/core";
import type { CardRow } from "@dailylingua/data";
import type { ReviewMode } from "@dailylingua/schemas";

/**
 * The key of a card is the mode it was served in (`j2-pr1-lot-w.md`, D5). A card served in a packet keeps that mode; a
 * card never served gets the one `cardRecallVariant` of core gives from its stability. Pure.
 */

/** The accepted written forms of a card in `production`: the front, then `payload.accept` (strings only). */
export function cardAcceptList(card: Pick<CardRow, "front" | "payload">): string[] {
  const accept = (card.payload as { accept?: unknown } | null)?.accept;
  const extra = Array.isArray(accept) ? accept.filter((value): value is string => typeof value === "string" && value.length > 0) : [];
  return [...new Set([card.front, ...extra])].slice(0, 50);
}

/** The mode a card is expected to be answered in: the served one, else the one its stability gives. */
export function expectedCardMode(card: Pick<CardRow, "stability" | "context">, served: ReviewMode | undefined): ReviewMode {
  if (served !== undefined) return served;
  return cardRecallVariant({ stability: card.stability, hasContext: card.context !== null && card.context.trim().length > 0 }).mode;
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
    const e = event as { clientEventId?: unknown; kind?: unknown; payload?: { cardId?: unknown; mode?: unknown } | null } | null;
    const expected = e?.kind === "review_attempt" && typeof e.payload?.cardId === "string" ? expectedModes.get(e.payload.cardId) : undefined;
    const known = typeof e?.clientEventId === "string" && Object.hasOwn(knownEvents, e.clientEventId);
    if (expected !== undefined && !known && e?.payload?.mode !== expected && typeof e?.clientEventId === "string") {
      rejected.push({ clientEventId: e.clientEventId, reason: "invalid_payload" });
    } else kept.push(event);
  }
  return { kept, rejected };
}
