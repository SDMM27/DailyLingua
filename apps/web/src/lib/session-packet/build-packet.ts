import type { CardRow, ItemRow, PacketTextRow, SessionRow } from "@dailylingua/data";
import { cefrLevelSchema, cardKindSchema, cardStateSchema, languageCodeSchema, sessionFormatSchema, sessionKindSchema, type DateKey, type SessionPacket, type StoredSessionPlan } from "@dailylingua/schemas";
import { cardAcceptList } from "@/lib/ingest/card-keys";
import { buildChoiceOptions } from "./options";

/**
 * The session packet (`j2-architecture.md` section 5) assembled from a stored session, its text, its cards and the day's
 * quotas. Pure: the route reads, this builds, the route validates the result with `sessionPacketSchema` before it
 * leaves. Answer keys are included on purpose (decision A1: the server grades every answer again).
 */

export interface PacketInput {
  session: SessionRow;
  plan: StoredSessionPlan;
  /** The text of the plan and every item it holds, or null (review-only session, or a text no longer published). */
  textBundle: { text: PacketTextRow; items: ItemRow[] } | null;
  /** The cards of the language by id (not deleted). */
  cards: ReadonlyMap<string, CardRow>;
  quotas: { writingFeedback: { used: number; limit: number }; rewriteCheck: { used: number; limit: number } };
  serverDay: DateKey;
  timeZone: string;
  /** Fallback when the stored session has no `served_at`. */
  now: Date;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const iso = (value: string) => new Date(value).toISOString();

function packetText(text: PacketTextRow): SessionPacket["text"] {
  const level = cefrLevelSchema.safeParse(text.levelBand);
  const language = languageCodeSchema.safeParse(text.language);
  const segment = isRecord(text.listeningSegment) ? text.listeningSegment : null;
  const from = segment?.from;
  const to = segment?.to;
  // A text without a writing task is never served.
  if (!level.success || !language.success || text.writingTask === null) return null;
  return {
    id: text.id,
    language: language.data,
    levelBand: level.data,
    density: text.density,
    theme: text.theme,
    title: text.title,
    body: text.body,
    wordCount: text.wordCount,
    newWords: (Array.isArray(text.newWords) ? text.newWords.filter(isRecord) : []).slice(0, 8),
    grammarPoint: text.grammarPoint,
    listeningSegment: typeof from === "number" && typeof to === "number" && Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to >= from ? { from, to } : null,
    writingTask: text.writingTask,
    ...(text.generationReviewed ? { generationReviewed: true } : {}),
  };
}

function packetItems(plan: StoredSessionPlan, items: readonly ItemRow[]): SessionPacket["items"] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const out: SessionPacket["items"] = [];
  for (const [step, ids] of [
    ["reading", plan.reading.itemIds],
    ["workshop", plan.workshop.itemIds],
  ] as const) {
    for (const id of ids) {
      const item = byId.get(id);
      // An item without a key cannot be graded: it is not served.
      if (!item || !item.key || !isRecord(item.prompt)) continue;
      const accept = Array.isArray(item.key.accept) ? item.key.accept.filter((value): value is string => typeof value === "string").slice(0, 50) : [];
      out.push({
        id: item.id,
        textId: item.textId,
        step,
        kind: item.kind as SessionPacket["items"][number]["kind"],
        position: item.position,
        prompt: item.prompt,
        listeningOnly: item.listeningOnly,
        key: { answer: typeof item.key.answer === "string" ? item.key.answer : null, accept },
      });
    }
  }
  return out;
}

function packetCards(plan: StoredSessionPlan, cards: ReadonlyMap<string, CardRow>, sessionId: string, language: string): SessionPacket["cards"] {
  const pool = [...cards.values()];
  const order = [...plan.wake.cardIds, ...Object.keys(plan.servedCards).filter((id) => !plan.wake.cardIds.includes(id)).sort((a, b) => (cards.get(a)?.dueAt ?? "").localeCompare(cards.get(b)?.dueAt ?? "") || (a < b ? -1 : 1))];
  const out: SessionPacket["cards"] = [];
  for (const id of order) {
    const card = cards.get(id);
    const mode = plan.servedCards[id];
    const kind = card ? cardKindSchema.safeParse(card.kind) : null;
    const state = card ? cardStateSchema.safeParse(card.state) : null;
    if (!card || mode === undefined || !kind?.success || !state?.success || state.data === "suspended" || state.data === "known") continue;
    const base = { id: card.id, kind: kind.data, state: state.data, dueAt: iso(card.dueAt), mode, front: card.front, back: card.back, context: card.context };
    if (mode === "production") {
      out.push({ ...base, correctOptionId: null, options: [], accept: cardAcceptList(card) });
      continue;
    }
    const choice = buildChoiceOptions(card, pool, language, sessionId);
    // Served as a choice but no longer able to be: left out, it stays due (the key of its mode would not exist).
    if (choice) out.push({ ...base, correctOptionId: choice.correctOptionId, options: choice.options, accept: [] });
  }
  return out.slice(0, 120);
}

/** The packet of a stored session. The result is checked against `sessionPacketSchema` by the caller. */
export function buildPacket(input: PacketInput): SessionPacket {
  const { session, plan, textBundle } = input;
  const text = textBundle ? packetText(textBundle.text) : null;
  return {
    session: {
      id: session.id,
      language: languageCodeSchema.parse(session.language),
      day: session.day,
      format: sessionFormatSchema.parse(session.format),
      kind: sessionKindSchema.parse(session.kind),
      status: session.status as SessionPacket["session"]["status"],
      servedAt: iso(session.servedAt ?? input.now.toISOString()),
    },
    steps: plan.steps.filter((step) => step.minutes > 0),
    text,
    items: text && textBundle ? packetItems(plan, textBundle.items) : [],
    cards: packetCards(plan, input.cards, session.id, session.language),
    wakeCardIds: plan.wake.cardIds,
    momentumWords: plan.momentumWords,
    errorOfTheDay: null,
    quotas: input.quotas,
    serverDay: input.serverDay,
    timeZone: input.timeZone,
  };
}
