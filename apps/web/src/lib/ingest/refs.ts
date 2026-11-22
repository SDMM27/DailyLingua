import type { IngestRefs } from "@dailylingua/data";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A batch has at most 50 events; this bounds the lists even if a caller forgets to check. */
const MAX_REFS = 500;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The ids the delivered events refer to, for `readIngestRows`. The events are NOT trusted: they are raw JSON that
 * `planIngest` validates later, so here a value counts only when it is a string in UUID form (anything else could
 * not be a row id, and a free string must never reach a database filter). An event that is not an object, a payload
 * that is not an object, a missing field: nothing is collected, nothing throws.
 */
export function extractRefs(events: readonly unknown[]): IngestRefs {
  const sets = {
    sessionIds: new Set<string>(),
    cardIds: new Set<string>(),
    textIds: new Set<string>(),
    productionIds: new Set<string>(),
    correctionIds: new Set<string>(),
    deviceIds: new Set<string>(),
    clientEventIds: new Set<string>(),
  };
  const take = (set: Set<string>, value: unknown) => {
    if (typeof value === "string" && UUID.test(value) && set.size < MAX_REFS) set.add(value);
  };
  for (const event of events) {
    if (!isRecord(event)) continue;
    take(sets.clientEventIds, event.clientEventId);
    const payload = event.payload;
    if (!isRecord(payload)) continue;
    take(sets.sessionIds, payload.sessionId);
    take(sets.cardIds, payload.cardId);
    take(sets.textIds, payload.textId);
    take(sets.productionIds, payload.productionId);
    if (event.kind === "rewrite_submitted") take(sets.correctionIds, payload.correctionId);
    take(sets.deviceIds, payload.deviceId);
  }
  return {
    sessionIds: [...sets.sessionIds],
    cardIds: [...sets.cardIds],
    textIds: [...sets.textIds],
    productionIds: [...sets.productionIds],
    ...(sets.correctionIds.size > 0 ? { correctionIds: [...sets.correctionIds] } : {}),
    deviceIds: [...sets.deviceIds],
    clientEventIds: [...sets.clientEventIds],
  };
}
