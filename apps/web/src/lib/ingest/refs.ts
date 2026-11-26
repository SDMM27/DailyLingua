import type { IngestRefs } from "@dailylingua/data";
import { UNIT_ID_PATTERN } from "@dailylingua/schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SENTENCE_ID = new RegExp(`^${UNIT_ID_PATTERN.source.slice(1, -1)}#[^#]+$`);
/** A batch has at most 50 events; this bounds the lists even if a caller forgets to check. */
const MAX_REFS = 500;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The ids the delivered events refer to, for `readIngestRows`. The events are NOT trusted: they are raw JSON that
 * `planIngest` validates later, so here a value counts only when it is a string in UUID form (anything else could
 * not be a row id, and a free string must never reach a database filter). An event that is not an object, a payload
 * that is not an object, a missing field: nothing is collected, nothing throws. A unit id counts only in the unit id
 * format (`UNIT_ID_PATTERN`).
 */
/** Longest sentence id (`MAX_ORAL_SENTENCE_ID_CHARS`); a longer string cannot be a sentence. */
const MAX_SENTENCE_ID_CHARS = 80;

/**
 * The ids of the oral sentences the events name, for `buildIngestState`. Like `extractRefs`, nothing is trusted: a
 * value counts only as a string of a sane length in the `<unit id>#<id>` form; the content registry answers for the rest.
 */
export function extractSentenceIds(events: readonly unknown[]): string[] {
  const ids = new Set<string>();
  for (const event of events) {
    if (!isRecord(event) || event.kind !== "oral_attempt" || !isRecord(event.payload)) continue;
    const id = event.payload.sentenceId;
    if (typeof id === "string" && id.length <= MAX_SENTENCE_ID_CHARS && SENTENCE_ID.test(id) && ids.size < MAX_REFS) ids.add(id);
  }
  return [...ids];
}

export function extractRefs(events: readonly unknown[]): IngestRefs {
  const sets = {
    sessionIds: new Set<string>(),
    cardIds: new Set<string>(),
    textIds: new Set<string>(),
    productionIds: new Set<string>(),
    correctionIds: new Set<string>(),
    deviceIds: new Set<string>(),
    clientEventIds: new Set<string>(),
    unitIds: new Set<string>(),
    unitTestIds: new Set<string>(),
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
    if (typeof payload.unitId === "string" && UNIT_ID_PATTERN.test(payload.unitId) && sets.unitIds.size < MAX_REFS) sets.unitIds.add(payload.unitId);
    if (event.kind === "unit_test_submitted") take(sets.unitTestIds, payload.attemptId);
  }
  return {
    sessionIds: [...sets.sessionIds],
    cardIds: [...sets.cardIds],
    textIds: [...sets.textIds],
    productionIds: [...sets.productionIds],
    ...(sets.correctionIds.size > 0 ? { correctionIds: [...sets.correctionIds] } : {}),
    deviceIds: [...sets.deviceIds],
    clientEventIds: [...sets.clientEventIds],
    ...(sets.unitIds.size > 0 ? { unitIds: [...sets.unitIds] } : {}),
    ...(sets.unitTestIds.size > 0 ? { unitTestIds: [...sets.unitTestIds] } : {}),
  };
}
