import {
  RULE_VERSION,
  clientEventSchema,
  isScriptUnit,
  emptyIngestPayload,
  type ClientEvent,
  type CardKind,
  type CardSource,
  type DateKey,
  type IngestPayload,
  type Unit,
  type UnitLessonId,
  type XpRuleId,
} from "@dailylingua/schemas";
import { addDays, learningDay, localTime } from "../dates";
import {
  CLOCK_ROLLBACK_MS,
  COUNT_CAPS,
  PRODUCTION_MIN_WORDS,
  REWRITE_MIN_SIMILARITY,
  RULE_VOLET,
  STREAK_VALIDATION_XP,
  acceptsTimeZoneChange,
  allStepsValidated,
  attribute,
  buildSettingsHistory,
  capCount,
  capFocus,
  capReading,
  capReview,
  capRewrite,
  dayStatuses,
  daysSkippedByTimeZoneChange,
  errorOfDayReworked,
  expressionValidated,
  fluencyPass,
  focusFirstTry,
  focusSecondTry,
  ledgerDay,
  momentumValidated,
  passWpm,
  productionRejection,
  readingDurationMs,
  readingUnderstood,
  readingValidated,
  recomputeStreak,
  reviewBonusDifficulty,
  reviewBonusReconquest,
  reviewOutcome,
  rewriteSentence,
  sessionComplete,
  timeZoneAt,
  unitComplete,
  wakeValidated,
  weekProgress,
  workshopValidated,
  type ReadingEvidence,
  type TimeZoneChange,
} from "../game";
import { characterSimilarity, countWords, gradeCardRecall, gradeChoice, gradeTyped, normalizeAnswer, ratingFor, trigramSimilarity, type Graded } from "../grading";
import { schedule, type MemoryState } from "../memory/fsrs";
import type { RejectedDelivery } from "../offline/types";
import { isErrorWorkable } from "../session/adapt";
import { PLAN_STEPS, WAKE_LIMITS, type PlanStep } from "../session/plan";
import { gradeUnitItem, gradeUnitTest, stepValidated } from "../units";
import { deterministicUuid, fingerprint } from "./hash";
import type { IngestReport, IngestState, PlanIngestResult, RawEvent, StateCard, StateDay, StateItem, StateProduction, StateSession, StateUnitProgress } from "./types";

const DAY_MS = 86_400_000;
const MAX_ANSWER_MS = 600_000;
const FLUENCY_WINDOW_DAYS = 7;

type Attributed = { ok: true; day: DateKey; late: boolean };
const emptyDay = (): StateDay => ({ xpByReason: {}, reviewSuccesses: 0, newCards: 0, readingTexts: 0, rewards: {}, focusBySession: {}, rewardsByCorrection: {}, counted: [] });
const sum = (values: Iterable<number>): number => {
  let total = 0;
  for (const value of values) total += value;
  return total;
};
const byKey = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * THE function the data layer calls to decide (`j2-pr1-lots.md`, lot C). From the state read in the database, the events
 * delivered and the reception instant, it grades and attributes every event, applies the XP rules, caps and yields,
 * advances the proofs of the steps, recomputes the days and the streak, and returns the `p_payload` of
 * `app.ingest_batch` (snake_case, see `ingest-payload.ts`), the permanent refusals and a report.
 *
 * Pure and deterministic: the same state, the same events and the same `now` give the same result; the order the
 * events arrive in within the batch does not matter (they are processed by instant, device and counter). A
 * replay of events already ingested (`state.knownEvents`) writes nothing. Nothing is read from a clock, a store or
 * the network; the answers of the AI (`rewrite_check`) and the corrections come in through the state.
 */
export function planIngest(state: IngestState, events: readonly RawEvent[], now: Date, options: PlanIngestOptions = {}): PlanIngestResult {
  return new Ingestion(state, now, options).run(events);
}

export interface PlanIngestOptions {
  /**
   * Units that are not published (`status` draft or reviewed) are accepted instead of being `unknown_unit`. Only for
   * local work (`UNIT_DRAFTS=show`), never in production.
   */
  allowDrafts?: boolean;
}

type Parsed = ClientEvent & { fp: string; occurredMs: number };
type UnitEvent = Extract<Parsed, { kind: "unit_item_attempt" | "unit_step_completed" | "unit_test_submitted" }>;

/** A card to create, whatever made it (a workshop word, a failed error item, a key phrase of a unit). */
interface NewCard {
  language: string;
  kind: CardKind;
  front: string;
  back: string | null;
  backLanguage: string | null;
  context: string | null;
  source: CardSource;
  payload: Record<string, unknown>;
}

const isUnitEvent = (event: Parsed): event is UnitEvent =>
  event.kind === "unit_item_attempt" || event.kind === "unit_step_completed" || event.kind === "unit_test_submitted";
/** The validation of this step turns the key phrases of the unit into cards. */
const KEY_PHRASES_STEP = "l1:key_phrases";

class Ingestion {
  private readonly s: IngestState;
  private readonly out: IngestPayload = emptyIngestPayload();
  private readonly rejected: RejectedDelivery[] = [];
  private readonly report: IngestReport = { accepted: 0, duplicates: [], zeroed: [], late: 0, lateXp: 0, clockRollbacks: 0, xpByRule: {}, streakEvents: [] };
  private readonly serverDay: DateKey;
  private journal: TimeZoneChange[];
  private readonly att = new Map<string, Attributed>();
  private readonly zones = new Map<string, string>();
  private readonly touchedDays = new Map<DateKey, { firstActivityAt: string; timeZone: string }>();
  private readonly travelDays = new Map<DateKey, string>();
  private readonly newXp: { day: DateKey; amount: number; late: boolean }[] = [];
  private readonly touchedSessions = new Map<string, { at: string; att: Attributed }>();
  private readonly touchedSteps = new Set<string>();
  private readonly sessionRows = new Map<string, { status: StateSession["status"]; startedAt: string | null; completedAt: string | null }>();
  private readonly completedDaily = new Map<DateKey, boolean>();
  private readonly newlyCompleted = new Set<string>();
  private readonly cardsCreated = new Set<string>();
  private readonly touchedUnits = new Set<string>();
  /** For each test attempt id of the batch, the event that keeps it (the first by instant): the others are duplicates. */
  private readonly firstTestEvents = new Map<string, string>();
  private lastChangeAt: Date | null;

  constructor(
    state: IngestState,
    private readonly now: Date,
    private readonly options: PlanIngestOptions = {},
  ) {
    this.s = structuredClone(state);
    this.journal = [...this.s.timezoneChanges];
    this.serverDay = learningDay(now, this.s.profile.timeZone);
    this.lastChangeAt = this.s.streak?.timeZoneChangedAt ? new Date(this.s.streak.timeZoneChangedAt) : null;
  }

  run(raw: readonly RawEvent[]): PlanIngestResult {
    const parsed = this.parseAndDedupe(raw);
    for (const event of [...parsed].sort(compareEvents)) {
      if (event.kind === "unit_test_submitted" && !this.firstTestEvents.has(event.payload.attemptId)) this.firstTestEvents.set(event.payload.attemptId, event.clientEventId);
    }
    const valid = parsed.filter((event) => this.precheck(event));
    this.attributeAll(valid);
    for (const event of [...valid].sort(compareEvents)) {
      if (!this.att.has(event.clientEventId)) continue;
      this.handle(event);
    }
    this.settleProductions();
    this.finishUnits();
    this.finishSessions();
    this.finishDays();
    this.finishStreak();
    this.finishCursors(valid);
    this.out.timezone_changes = this.journal.filter((change) => !this.s.timezoneChanges.some((known) => known.effectiveAt === change.effectiveAt && known.timeZone === change.timeZone)).map((change) => ({ effective_at: change.effectiveAt, time_zone: change.timeZone }));
    this.s.timezoneChanges = this.journal;
    return { payload: this.out, rejected: this.rejected, report: this.report, nextState: this.s };
  }

  // ---------------------------------------------------------------- parsing

  private reject(clientEventId: string, reason: RejectedDelivery["reason"]): void {
    this.rejected.push({ clientEventId, reason });
  }

  private parseAndDedupe(raw: readonly RawEvent[]): Parsed[] {
    const seen = new Map<string, string>();
    const parsed: Parsed[] = [];
    for (const item of raw) {
      const result = clientEventSchema.safeParse(item);
      const id = typeof item?.clientEventId === "string" ? item.clientEventId : null;
      if (!result.success) {
        if (id !== null) this.reject(id, "invalid_payload");
        continue;
      }
      const event = result.data;
      const fp = fingerprint({ kind: event.kind, occurredAt: event.occurredAt, payload: event.payload });
      const id2 = event.clientEventId;
      if (Object.hasOwn(this.s.knownEvents, id2)) {
        const known = this.s.knownEvents[id2];
        if (known != null && known !== fp) this.reject(id2, "duplicate_conflict");
        else this.report.duplicates.push(id2);
        continue;
      }
      const earlier = seen.get(id2);
      if (earlier !== undefined) {
        if (earlier !== fp) this.reject(id2, "duplicate_conflict");
        continue;
      }
      seen.set(id2, fp);
      parsed.push({ ...event, fp, occurredMs: Date.parse(event.occurredAt) });
    }
    return parsed;
  }

  /** Time, served-at and reference checks: the refusals that do not depend on the zone. */
  private precheck(event: Parsed): boolean {
    const received = this.now.getTime();
    if (event.occurredMs > received + 5 * 60_000) return this.no(event, "in_future");
    if (received - event.occurredMs > 7 * DAY_MS) return this.no(event, "too_old");
    let servedAt: string | null = null;
    const p = event.payload as Record<string, unknown>;
    if (typeof p.sessionId === "string") {
      const session = this.s.sessions[p.sessionId];
      if (!session) return this.no(event, "unknown_session");
      if (session.userId !== this.s.userId) return this.no(event, "foreign_session");
      servedAt = session.servedAt;
      if (event.kind === "reading_progress" && session.readingTextId !== p.textId) return this.no(event, "unknown_item");
      if (event.kind === "comprehension_answer" && !(session.readingItemIds.includes(p.itemId as string) && this.s.items[p.itemId as string])) return this.no(event, "unknown_item");
      if (event.kind === "focus_attempt" && !(this.itemsOfWorkshop(session).includes(p.itemId as string) && this.s.items[p.itemId as string])) return this.no(event, "unknown_item");
      if (event.kind === "fluency_pass" && !this.s.texts[p.textId as string]) return this.no(event, "unknown_item");
      if (event.kind === "production_submitted" && this.s.productions[p.productionId as string]) return this.no(event, "duplicate_conflict");
      if (event.kind === "review_attempt" && session.servedCards?.[event.payload.cardId] !== event.payload.mode) return this.no(event, "invalid_payload");
    }
    if (event.kind === "review_attempt") {
      const card = this.s.cards[event.payload.cardId];
      if (!card || card.userId !== this.s.userId || card.state === "suspended" || card.state === "known") return this.no(event, "unknown_card");
      if (card.state !== "new" && (card.stability === null || card.difficulty === null || card.lastReviewAt === null)) return this.no(event, "unknown_card");
      if (!event.payload.sessionId) servedAt = card.servedAt;
    }
    if (event.kind === "rewrite_submitted") {
      const correction = this.s.corrections[event.payload.correctionId];
      if (!correction) return this.no(event, "unknown_correction");
      if (event.payload.sentenceIndex >= correction.sentences.length) return this.no(event, "invalid_payload");
    }
    if (isUnitEvent(event)) {
      const refusal = this.unitRefusal(event);
      if (refusal !== null) return this.no(event, refusal);
    }
    if (servedAt !== null && event.occurredMs < Date.parse(servedAt) - 60_000) return this.no(event, "before_served");
    return true;
  }

  private no(event: Parsed, reason: RejectedDelivery["reason"]): false {
    this.reject(event.clientEventId, reason);
    return false;
  }

  private itemsOfWorkshop(session: StateSession): string[] {
    return [...session.workshopItemIds, ...(session.errorItemId ? [session.errorItemId] : [])];
  }

  private wakeItems(session: StateSession): string[] {
    const item = session.errorItemId ? this.s.items[session.errorItemId] : undefined;
    return item ? [...session.wakeCardIds, item.id] : session.wakeCardIds;
  }

  // ------------------------------------------------------------ attribution

  /** Journal of zones (by instant), then days (by device and counter, monotone), over the events that passed the checks. */
  private attributeAll(valid: Parsed[]): void {
    for (const event of [...valid].sort((a, b) => a.occurredMs - b.occurredMs || byKey(a.clientEventId, b.clientEventId))) {
      const occurred = new Date(event.occurredMs);
      const inForce = timeZoneAt(this.journal, occurred, this.s.profile.timeZone);
      const lastEntry = this.journal.reduce<Date | null>((latest, c) => (latest === null || Date.parse(c.effectiveAt) > latest.getTime() ? new Date(c.effectiveAt) : latest), null);
      if (acceptsTimeZoneChange({ reportedZone: event.payload.tz, zoneInForce: inForce, occurredAt: occurred, lastEntryAt: lastEntry, lastChangeAt: this.lastChangeAt })) {
        if (this.journal.length === 0) this.journal.push({ effectiveAt: this.s.profile.createdAt, timeZone: inForce });
        this.journal.push({ effectiveAt: event.occurredAt, timeZone: event.payload.tz });
        this.lastChangeAt = occurred;
        for (const day of daysSkippedByTimeZoneChange({ at: occurred, fromZone: inForce, toZone: event.payload.tz })) this.travelDays.set(day, event.payload.tz);
      }
      this.zones.set(event.clientEventId, timeZoneAt(this.journal, occurred, this.s.profile.timeZone));
    }
    const devices = new Map<string, Parsed[]>();
    for (const event of valid) devices.set(event.payload.deviceId, [...(devices.get(event.payload.deviceId) ?? []), event]);
    for (const [deviceId, list] of devices) {
      const cursor = this.s.deviceCursors[deviceId];
      let running = null as DateKey | null;
      let previous = null as Parsed | null;
      for (const event of list.sort((a, b) => a.payload.seq - b.payload.seq || byKey(a.clientEventId, b.clientEventId))) {
        const fromCursor = cursor && event.payload.seq > cursor.lastSeq ? cursor.lastDay : null;
        const floorDay = running !== null && (fromCursor === null || running > fromCursor) ? running : fromCursor;
        const result = attribute({
          occurredAt: new Date(event.occurredMs),
          receivedAt: this.now,
          servedAt: null,
          timeZone: this.zones.get(event.clientEventId) as string,
          floorDay,
        });
        if (!result.ok) {
          this.reject(event.clientEventId, result.reason);
          continue;
        }
        if (previous !== null && previous.occurredMs - event.occurredMs > CLOCK_ROLLBACK_MS) this.report.clockRollbacks++;
        this.att.set(event.clientEventId, { ok: true, day: result.day, late: result.late });
        running = running === null || result.day > running ? result.day : running;
        previous = event;
      }
    }
  }

  // --------------------------------------------------------------- counters

  private day(day: DateKey): StateDay {
    return (this.s.days[day] ??= emptyDay());
  }

  private xpToday(day: DateKey, test: (reason: string) => boolean): number {
    return sum(Object.entries(this.day(day).xpByReason).filter(([reason]) => test(reason)).map(([, amount]) => amount));
  }

  private zero(clientEventId: string, reason: string | null): void {
    if (reason !== null) this.report.zeroed.push({ clientEventId, reason });
  }

  private emitXp(o: {
    rule: XpRuleId;
    amount: number;
    source: { kind: "attempt" | "review"; id: string } | null;
    language: string;
    at: Attributed;
    /** Distinguishes lines without a source that share day, language and reason (SQL drops an identical one). */
    ref?: string;
    long?: boolean;
    diminished?: boolean;
  }): void {
    if (o.amount <= 0) return;
    const day = ledgerDay(o.at, this.serverDay);
    this.out.xp.push({
      source: o.source ? { kind: o.source.kind, client_event_id: o.source.id } : null,
      language: o.language,
      day,
      amount: o.amount,
      reason: o.rule,
      rule_version: RULE_VERSION,
      league_eligible: true,
      meta: { occurredDay: o.at.day, late: o.at.late, long: o.long ?? false, diminished: o.diminished ?? false, volet: RULE_VOLET[o.rule], ...(o.ref ? { ref: o.ref } : {}) },
    });
    const d = this.day(o.at.day);
    d.xpByReason[o.rule] = (d.xpByReason[o.rule] ?? 0) + o.amount;
    this.newXp.push({ day: o.at.day, amount: o.amount, late: o.at.late });
    this.report.xpByRule[o.rule] = (this.report.xpByRule[o.rule] ?? 0) + o.amount;
    if (o.at.late) this.report.lateXp += o.amount;
  }

  private touchDay(event: Parsed, at: Attributed): void {
    if (at.late) return;
    const known = this.touchedDays.get(at.day);
    if (!known || event.occurredAt < known.firstActivityAt) this.touchedDays.set(at.day, { firstActivityAt: event.occurredAt, timeZone: this.zones.get(event.clientEventId) as string });
  }

  private touchSession(session: StateSession, step: PlanStep | null, event: { occurredAt: string }, at: Attributed): void {
    const known = this.touchedSessions.get(session.id);
    if (!known || event.occurredAt >= known.at) this.touchedSessions.set(session.id, { at: event.occurredAt, att: at });
    if (step) this.touchedSteps.add(`${session.id}:${step}`);
  }

  private proof(session: StateSession, step: PlanStep): Record<string, unknown> {
    const entry = (session.steps[step] ??= { validatedAt: null, proof: {} });
    return entry.proof;
  }

  private sessionFor(language: string, day: DateKey): StateSession | null {
    const rank = { daily: 0, catch_up: 1, review_only: 2 } as const;
    const found = Object.values(this.s.sessions).filter((session) => session.userId === this.s.userId && session.language === language && session.day === day);
    return found.sort((a, b) => rank[a.kind] - rank[b.kind] || byKey(a.id, b.id))[0] ?? null;
  }

  // ----------------------------------------------------------------- events

  private handle(event: Parsed): void {
    // The only refusal that depends on the events before it (the attempts of the batch): decided in instant order.
    if (event.kind === "unit_step_completed" && !this.unitStepProven(event)) {
      this.att.delete(event.clientEventId);
      this.reject(event.clientEventId, "step_not_proven");
      return;
    }
    const at = this.att.get(event.clientEventId) as Attributed;
    this.report.accepted++;
    if (at.late) this.report.late++;
    this.s.knownEvents[event.clientEventId] = event.fp;
    if (event.kind !== "ui_event") this.touchDay(event, at);
    switch (event.kind) {
      case "session_started":
        return this.onSessionStarted(event, at);
      case "review_attempt":
        return this.onReview(event, at);
      case "reading_progress":
        return this.onReadingProgress(event, at);
      case "comprehension_answer":
        return this.onComprehension(event, at);
      case "focus_attempt":
        return this.onFocus(event, at);
      case "production_submitted":
        return this.onProduction(event, at);
      case "rewrite_submitted":
        return this.onRewrite(event, at);
      case "fluency_pass":
        return this.onFluency(event, at);
      case "session_step_completed":
        return; // indicative only: the server recomputes the validation of the step
      case "ui_event":
        this.out.ui_events.push({ client_event_id: event.clientEventId, name: event.payload.name, value: event.payload.value, occurred_at: event.occurredAt });
        return;
      case "unit_item_attempt":
        return this.onUnitItem(event, at);
      case "unit_step_completed":
        return this.onUnitStep(event, at);
      case "unit_test_submitted":
        return this.onUnitTest(event, at);
    }
  }

  private onSessionStarted(event: Extract<Parsed, { kind: "session_started" }>, at: Attributed): void {
    const session = this.s.sessions[event.payload.sessionId] as StateSession;
    if (session.status === "planned") {
      session.status = "started";
      session.startedAt = event.occurredAt;
    }
    this.markSession(session);
    this.touchSession(session, null, event, at);
  }

  private markSession(session: StateSession): void {
    this.sessionRows.set(session.id, { status: session.status, startedAt: session.startedAt, completedAt: session.completedAt });
  }

  private tolerance() {
    return this.s.profile.answerTolerance;
  }

  private onReview(event: Extract<Parsed, { kind: "review_attempt" }>, at: Attributed): void {
    const p = event.payload;
    const card = this.s.cards[p.cardId] as StateCard;
    const answeredMs = Date.parse(p.answeredAt);
    const elapsedMs = Math.min(answeredMs - Date.parse(p.shownAt), MAX_ANSWER_MS);
    const gradingKey = p.sessionId
      ? { optionId: p.mode === "production" ? null : card.id, accept: card.productionAccept ?? card.accept }
      : { optionId: card.optionId, accept: card.accept };
    const graded = gradeCardRecall({ language: card.language, mode: p.mode, answer: p.answer, key: gradingKey, tolerance: this.tolerance() });
    const rating = ratingFor(graded, { elapsedMs });
    const memory: MemoryState = {
      state: card.state,
      stability: card.stability,
      difficulty: card.difficulty,
      dueAt: new Date(card.dueAt),
      lastReviewAt: card.lastReviewAt ? new Date(card.lastReviewAt) : null,
      reps: card.reps,
      lapses: card.lapses,
    };
    // A review delivered out of order (another device was faster) is scheduled no earlier than the card's last review.
    const scheduledAt = new Date(Math.max(answeredMs, memory.lastReviewAt?.getTime() ?? answeredMs));
    const next = schedule(memory, rating, scheduledAt);
    const d = this.day(at.day);
    const namedSession = p.sessionId ? this.s.sessions[p.sessionId] : undefined;
    const session = namedSession ? (namedSession.day === at.day ? namedSession : undefined) : this.sessionFor(card.language, at.day);
    const limit = WAKE_LIMITS[session?.format ?? 15].newCardsPerDay;
    const isNew = card.state === "new";
    const due = isNew ? d.newCards < limit : new Date(card.dueAt).getTime() <= Date.parse(p.shownAt);
    const key = `review:${card.id}`;
    const outcome = reviewOutcome(p.mode, { correct: graded.correct, due, elapsedMs, alreadyCountedToday: d.counted.includes(key), audioPlays: p.audioPlays });
    const source = { kind: "review" as const, id: event.clientEventId };
    if (graded.correct && outcome.zero === null && outcome.amount > 0) {
      d.counted.push(key);
      d.reviewSuccesses++;
      const successIndex = d.reviewSuccesses;
      const pay = (rule: XpRuleId, base: number) => {
        if (base <= 0) return;
        const granted = capReview(base, { successIndex, xpToday: this.xpToday(at.day, (reason) => reason.startsWith("review.")) });
        if (granted.amount > 0) {
          this.emitXp({ rule, amount: granted.amount, source, language: card.language, at, diminished: granted.diminished });
        } else if (rule === outcome.rule) this.zero(event.clientEventId, granted.zero);
      };
      pay(outcome.rule, outcome.amount);
      pay("review.bonus.difficulty", reviewBonusDifficulty({ stability: card.stability, lapses: card.lapses }).amount);
      const yesterday = card.lastReview && card.lastReview.day === addDays(at.day, -1) ? card.lastReview.rating : null;
      pay("review.bonus.reconquest", reviewBonusReconquest({ lastRatingYesterday: yesterday }).amount);
    } else if (graded.correct) {
      this.zero(event.clientEventId, outcome.zero);
    }
    if (isNew) d.newCards++;
    card.state = next.state.state;
    card.stability = next.state.stability;
    card.difficulty = next.state.difficulty;
    card.dueAt = next.state.dueAt.toISOString();
    card.lastReviewAt = (next.state.lastReviewAt as Date).toISOString();
    card.reps = next.state.reps;
    card.lapses = next.state.lapses;
    card.lastReview = { day: at.day, rating };
    this.out.reviews.push({
      client_event_id: event.clientEventId,
      card_id: card.id,
      rating,
      mode: p.mode,
      reviewed_at: p.answeredAt,
      elapsed_days: next.elapsedDays,
      scheduled_days: next.scheduledDays,
      card: { state: card.state, stability: card.stability, difficulty: card.difficulty, due_at: card.dueAt, last_review_at: card.lastReviewAt, reps: card.reps, lapses: card.lapses },
    });
    if (session) {
      const proof = this.proof(session, "wake");
      const answered = (proof.answered as string[] | undefined) ?? [];
      proof.answered = answered.includes(card.id) ? answered : [...answered, card.id];
      proof.ms = ((proof.ms as number | undefined) ?? 0) + Math.max(0, elapsedMs);
      this.touchSession(session, "wake", event, at);
    }
  }

  private gradeItem(item: StateItem, answer: string): Graded {
    if (item.kind === "mcq") return gradeChoice(answer, item.answer);
    const kind = item.kind === "transform" ? "transform" : item.kind === "cloze" ? "cloze" : "short_answer";
    return gradeTyped({ language: item.language, kind, answer, accept: item.accept, tolerance: this.tolerance() });
  }

  private readingEvidence(session: StateSession): ReadingEvidence & Record<string, unknown> {
    const proof = this.proof(session, "reading");
    proof.maxRatio ??= 0;
    proof.startedMs ??= null;
    proof.endedMs ??= null;
    proof.answers ??= {};
    return proof as ReadingEvidence & Record<string, unknown>;
  }

  private onReadingProgress(event: Extract<Parsed, { kind: "reading_progress" }>, at: Attributed): void {
    const session = this.s.sessions[event.payload.sessionId] as StateSession;
    const evidence = this.readingEvidence(session);
    const ratio = event.payload.ratio;
    if (ratio >= evidence.maxRatio) {
      if (ratio === 0 && evidence.startedMs === null) evidence.startedMs = event.occurredMs;
      if (ratio === 1) evidence.endedMs = evidence.endedMs ?? event.occurredMs;
      evidence.maxRatio = ratio;
    }
    this.touchSession(session, "reading", event, at);
    this.settleReading(session, at);
  }

  private onComprehension(event: Extract<Parsed, { kind: "comprehension_answer" }>, at: Attributed): void {
    const p = event.payload;
    const session = this.s.sessions[p.sessionId] as StateSession;
    const item = this.s.items[p.itemId] as StateItem;
    const graded = this.gradeItem(item, p.answer);
    this.out.attempts.push({
      client_event_id: event.clientEventId,
      session_id: session.id,
      language: item.language,
      step: "reading",
      exercise_kind: item.kind,
      exercise_ref: item.id,
      answer: { value: p.answer },
      result: { verdict: graded.verdict, ...(graded.shown ? { shown: graded.shown } : {}) },
      correct: graded.correct,
      duration_ms: 0,
      occurred_at: event.occurredAt,
    });
    const evidence = this.readingEvidence(session);
    if (!(item.id in evidence.answers)) evidence.answers[item.id] = graded.correct;
    this.touchSession(session, "reading", event, at);
    this.settleReading(session, at);
  }

  /** Pays `reading.*` once, when the proof is complete (end reached, no faster than 400 wpm, 3 answers). */
  private settleReading(session: StateSession, at: Attributed): void {
    const text = session.readingTextId ? this.s.texts[session.readingTextId] : undefined;
    if (!text) return;
    const evidence = this.readingEvidence(session);
    if (evidence.settled === true || !readingValidated(text.wordCount, evidence)) return;
    evidence.settled = true;
    const served = Math.max(session.readingItemIds.length, Object.keys(evidence.answers).length);
    const right = Object.values(evidence.answers).filter(Boolean).length;
    const score = served > 0 ? right / served : 0;
    const readingMs = readingDurationMs(evidence) as number;
    evidence.score = score;
    evidence.wpm = passWpm(text.wordCount, readingMs);
    const d = this.day(at.day);
    const key = `reading:${text.id}`;
    const outcome = readingUnderstood({ score, words: text.wordCount, readingMs, answers: Object.keys(evidence.answers).length, firstPassOfDay: !d.counted.includes(key) });
    const clientEventId = `${session.id}:${text.id}`;
    if (outcome.amount > 0) {
      const granted = capReading(outcome.amount, { textsToday: d.readingTexts, xpToday: this.xpToday(at.day, (reason) => reason.startsWith("reading.")) });
      if (granted.amount > 0) {
        d.readingTexts++;
        this.emitXp({ rule: outcome.rule, amount: granted.amount, source: null, language: session.language, at, ref: clientEventId, long: outcome.long, diminished: granted.diminished });
      } else this.zero(clientEventId, granted.zero);
    } else this.zero(clientEventId, outcome.zero);
    if (!d.counted.includes(key)) d.counted.push(key);
    if (score >= 0.6) {
      text.readingEarnedDay = at.day;
      text.referenceWpm ??= evidence.wpm as number;
    }
    if (!this.s.textReads.includes(text.id)) {
      this.s.textReads.push(text.id);
      this.out.text_reads.push({ text_id: text.id, first_read_day: at.day });
    }
  }

  private onFocus(event: Extract<Parsed, { kind: "focus_attempt" }>, at: Attributed): void {
    const p = event.payload;
    const session = this.s.sessions[p.sessionId] as StateSession;
    const item = this.s.items[p.itemId] as StateItem;
    const graded = this.gradeItem(item, p.answer);
    const isError = item.origin === "error_of_day";
    const d = this.day(at.day);
    const wrongKey = `focusWrong:${item.id}`;
    const alreadyPassed = d.counted.includes(`focus${p.try === 1 ? 1 : 2}:${item.id}`);
    let xpReason: string | null = null;
    const source = { kind: "attempt" as const, id: event.clientEventId };
    if (isError) {
      const workable = item.errorOfDay
        ? item.errorOfDay.createdDay < at.day && isErrorWorkable(item.errorOfDay.createdDay, item.reworkedDay, at.day)
        : item.reworkedDay === null;
      const outcome = errorOfDayReworked({ correct: graded.correct, alreadyReworked: !workable });
      if (outcome.amount > 0) {
        const granted = capCount(outcome.amount, { rewardsToday: d.rewards["error_of_day.reworked"] ?? 0, max: COUNT_CAPS["error_of_day.reworked"] as number });
        if (granted.amount > 0) {
          d.rewards["error_of_day.reworked"] = (d.rewards["error_of_day.reworked"] ?? 0) + 1;
          this.emitXp({ rule: "error_of_day.reworked", amount: granted.amount, source, language: item.language, at });
        } else xpReason = granted.zero;
      } else xpReason = outcome.zero;
      if (graded.correct && workable && item.errorItemId) {
        item.reworkedDay = at.day;
        this.out.error_items.push({ id: item.errorItemId, reworked_day: at.day });
      }
      if (!graded.correct && workable && p.try === 1) this.createCard(item, at, event.clientEventId);
      const proof = this.proof(session, "wake");
      const answered = (proof.answered as string[] | undefined) ?? [];
      if (!answered.includes(item.id)) proof.answered = [...answered, item.id];
    } else {
      const proof = { attempt: p.try, correct: graded.correct, firstWrong: d.counted.includes(wrongKey), alreadyPassedToday: alreadyPassed };
      const outcome = p.try === 1 ? focusFirstTry(proof) : focusSecondTry(proof);
      if (outcome.amount > 0) {
        const granted = capFocus(outcome.amount, { xpSession: d.focusBySession[session.id] ?? 0, xpDay: this.xpToday(at.day, (reason) => reason.startsWith("focus.")) });
        if (granted.amount > 0) {
          d.focusBySession[session.id] = (d.focusBySession[session.id] ?? 0) + granted.amount;
          this.emitXp({ rule: outcome.rule, amount: granted.amount, source, language: item.language, at });
        } else xpReason = granted.zero;
      } else if (graded.correct) xpReason = outcome.zero;
      if (p.try === 1 && !graded.correct && !d.counted.includes(wrongKey)) d.counted.push(wrongKey);
      if (p.try === 1 && item.card) this.createCard(item, at, event.clientEventId);
      const marker = `focus${p.try === 1 ? 1 : 2}:${item.id}`;
      if (p.try <= 2 && !d.counted.includes(marker)) d.counted.push(marker);
      const proofStep = this.proof(session, "workshop");
      const attempted = (proofStep.attempted as string[] | undefined) ?? [];
      proofStep.attempted = attempted.includes(item.id) ? attempted : [...attempted, item.id];
    }
    this.zero(event.clientEventId, graded.correct ? xpReason : null);
    this.out.attempts.push({
      client_event_id: event.clientEventId,
      session_id: session.id,
      language: item.language,
      step: isError ? "wake" : "workshop",
      exercise_kind: isError ? "error_fix" : item.kind,
      exercise_ref: item.id,
      answer: { value: p.answer, try: p.try },
      result: { verdict: graded.verdict, try: p.try, ...(graded.shown ? { shown: graded.shown } : {}), ...(xpReason && graded.correct ? { xpReason } : {}) },
      correct: graded.correct,
      duration_ms: Math.max(0, event.occurredMs - Date.parse(p.shownAt)),
      occurred_at: event.occurredAt,
    });
    this.touchSession(session, isError ? "wake" : "workshop", event, at);
  }

  /** A workshop word, or an error item that was failed, becomes a card due the next learning day. */
  private createCard(item: StateItem, at: Attributed, eventId: string): void {
    if (!item.card) return;
    const fingerKey = cardFingerKey(item.language, item.card.kind, item.card.front);
    if (this.hasCard(fingerKey)) return;
    if (item.origin === "error_of_day") {
      const d = this.day(at.day);
      if (d.counted.includes("errorCard")) return;
      d.counted.push("errorCard");
    }
    this.insertCard(fingerKey, { language: item.language, kind: item.card.kind, front: item.card.front, back: item.card.back, backLanguage: item.card.backLanguage, context: item.card.context, source: item.origin === "error_of_day" ? "feedback" : "session", payload: { itemId: item.id, ...(item.textId ? { textId: item.textId } : {}), ...(item.origin === "error_of_day" ? { errorOfDay: true, accept: item.accept } : {}) } }, at, eventId);
  }

  /** The learner already has a card of this language, kind and front (`cardFronts`), or the batch made one. */
  private hasCard(fingerKey: string): boolean {
    return this.s.cardFronts.includes(fingerKey) || this.cardsCreated.has(fingerKey);
  }

  /** Writes a new card, due at 04:00 the learning day after the action; its id is derived from the learner and the front. */
  private insertCard(fingerKey: string, card: NewCard, at: Attributed, eventId: string): void {
    this.cardsCreated.add(fingerKey);
    this.s.cardFronts.push(fingerKey);
    const zone = this.zones.get(eventId) ?? this.s.profile.timeZone;
    const id = deterministicUuid(`card:${this.s.userId}:${fingerKey}`);
    const dueAt = localTime(addDays(at.day, 1), "04:00", zone).toISOString();
    this.out.cards_created.push({ id, language: card.language, kind: card.kind, front: card.front, back: card.back, back_language: card.backLanguage, context: card.context, source: card.source, payload: card.payload, state: "new", due_at: dueAt });
  }

  private onProduction(event: Extract<Parsed, { kind: "production_submitted" }>, at: Attributed): void {
    const p = event.payload;
    const session = this.s.sessions[p.sessionId] as StateSession;
    const production = { id: p.productionId, sessionId: session.id, language: session.language, text: p.text, day: at.day, late: at.late, settled: false, correctionDeferred: false, clientEventId: event.clientEventId };
    const initialSimilarity = this.productionSimilarity(production);
    const task = { initialSimilarity, ...(session.readingTextId ? { textId: session.readingTextId } : {}) };
    this.out.productions.push({ id: p.productionId, client_event_id: event.clientEventId, session_id: session.id, language: session.language, mode: "writing", task, text: p.text });
    this.s.productions[p.productionId] = { ...production, initialSimilarity };
    this.s.recentProductionTexts.unshift({ id: production.id, text: production.text });
    this.s.recentProductionTexts.length = Math.min(30, this.s.recentProductionTexts.length);
    this.touchSession(session, "expression", event, at);
  }

  private onRewrite(event: Extract<Parsed, { kind: "rewrite_submitted" }>, at: Attributed): void {
    const p = event.payload;
    const correction = this.s.corrections[p.correctionId] as IngestState["corrections"][string];
    const production = this.s.productions[correction.productionId];
    if (production) {
      production.feedbackEligible = this.productionHasEligibilityEvidence(production)
        && this.productionVerdict(production, correction) === null;
    }
    if (!production?.feedbackEligible) {
      this.out.rewrites.push({ client_event_id: event.clientEventId, correction_id: correction.id, sentence_index: p.sentenceIndex, text: p.text, accepted: false });
      return;
    }
    const sentence = correction.sentences[p.sentenceIndex] as IngestState["corrections"][string]["sentences"][number];
    const language = correction.language;
    const text = normalizeAnswer(language, p.text);
    const fixedByCode = sentence.errors.filter((error) => !text.includes(normalizeAnswer(language, error.original)) && text.includes(normalizeAnswer(language, error.corrected)));
    const fixedByAi = (this.s.rewriteChecks[event.clientEventId]?.fixedErrorIds ?? []).filter((id) => sentence.errors.some((error) => error.id === id));
    const fixed = fixedByCode.length > 0 || fixedByAi.length > 0;
    const similar = characterSimilarity(language, sentence.text, p.text) >= REWRITE_MIN_SIMILARITY;
    const verified = (this.s.verifiedSentences ??= {})[correction.id] ??= [];
    const alreadyVerified = verified.includes(p.sentenceIndex);
    const accepted = fixed && similar;
    this.out.rewrites.push({ client_event_id: event.clientEventId, correction_id: correction.id, sentence_index: p.sentenceIndex, text: p.text, accepted });
    const d = this.day(at.day);
    const session = correction.sessionId ? this.s.sessions[correction.sessionId] : undefined;
    if (accepted && !alreadyVerified) {
      verified.push(p.sentenceIndex);
      const key = `rewrite:${correction.id}:${p.sentenceIndex}`;
      const native = sentence.nativeText !== null && normalizeAnswer(language, sentence.nativeText) === text;
      const outcome = rewriteSentence({ accepted: true, isNativeVersion: native });
      if (d.counted.includes(key)) this.zero(event.clientEventId, "already_counted_today");
      else {
        const granted = capRewrite(outcome.amount, { rewardedForProduction: d.rewardsByCorrection[correction.id] ?? 0, xpDay: this.xpToday(at.day, (reason) => reason.startsWith("rewrite.")) });
        if (granted.amount > 0) {
          d.rewardsByCorrection[correction.id] = (d.rewardsByCorrection[correction.id] ?? 0) + 1;
          this.emitXp({ rule: outcome.rule, amount: granted.amount, source: null, language, at, ref: `${correction.id}:${p.sentenceIndex}` });
        } else this.zero(event.clientEventId, granted.zero);
        d.counted.push(key);
      }
    }
    if (session) {
      const proof = this.proof(session, "expression");
      if (accepted && !alreadyVerified) proof.verifiedRewrites = ((proof.verifiedRewrites as number | undefined) ?? 0) + 1;
      this.touchSession(session, "expression", event, at);
    }
  }

  private onFluency(event: Extract<Parsed, { kind: "fluency_pass" }>, at: Attributed): void {
    const p = event.payload;
    const session = this.s.sessions[p.sessionId] as StateSession;
    const text = this.s.texts[p.textId] as IngestState["texts"][string];
    const durationMs = Date.parse(p.endedAt) - Date.parse(p.startedAt);
    const words = Math.min(session.momentumWords ?? text.wordCount, text.wordCount);
    const earnedRecently = text.readingEarnedDay !== null && text.readingEarnedDay <= at.day && text.readingEarnedDay >= addDays(at.day, -FLUENCY_WINDOW_DAYS);
    const wpm = passWpm(words, durationMs);
    const outcome = fluencyPass({ durationMs, words, readingEarnedRecently: earnedRecently, referenceWpm: text.referenceWpm });
    const d = this.day(at.day);
    let xpReason: string | null = outcome.zero;
    if (outcome.amount > 0) {
      const granted = capCount(outcome.amount, { rewardsToday: d.rewards["fluency.pass"] ?? 0, max: COUNT_CAPS["fluency.pass"] as number });
      if (granted.amount > 0) {
        d.rewards["fluency.pass"] = (d.rewards["fluency.pass"] ?? 0) + 1;
        this.emitXp({ rule: "fluency.pass", amount: granted.amount, source: { kind: "attempt", id: event.clientEventId }, language: session.language, at });
        xpReason = null;
      } else xpReason = granted.zero;
    }
    this.zero(event.clientEventId, xpReason);
    this.out.attempts.push({
      client_event_id: event.clientEventId,
      session_id: session.id,
      language: session.language,
      step: "momentum",
      exercise_kind: "fluency_pass",
      exercise_ref: text.id,
      answer: { startedAt: p.startedAt, endedAt: p.endedAt },
      result: { wpm: Math.round(wpm * 10) / 10, ...(xpReason ? { xpReason } : {}) },
      correct: true,
      duration_ms: durationMs,
      occurred_at: event.occurredAt,
    });
    const proof = this.proof(session, "momentum");
    if (momentumValidated({ durationMs, words })) {
      proof.momentumOk = true;
      text.referenceWpm = wpm;
    }
    this.touchSession(session, "momentum", event, at);
  }

  // ------------------------------------------------------------------ units

  /** The unit an event names, if the server serves it: present, with the same id, and published unless drafts are allowed. */
  private unitOf(unitId: string): Unit | undefined {
    const unit = Object.hasOwn(this.s.units, unitId) ? this.s.units[unitId] : undefined;
    if (!unit || unit.id !== unitId) return undefined;
    if (unit.status !== "published" && this.options.allowDrafts !== true) return undefined;
    return unit;
  }

  /** Item ids of the steps of a lesson of the unit. */
  private lessonItemIds(unit: Unit, lesson: UnitLessonId): string[] {
    return unit.lessons.find((entry) => entry.id === lesson)?.steps.flatMap((step) => step.itemIds) ?? [];
  }

  /** The permanent refusals of a unit event that do not depend on the other events of the batch. */
  private unitRefusal(event: UnitEvent): RejectedDelivery["reason"] | null {
    const unit = this.unitOf(event.payload.unitId);
    if (!unit) return "unknown_unit";
    if (unit.version !== event.payload.unitVersion) return "unit_version_mismatch";
    if (event.kind === "unit_item_attempt") {
      const { lesson, itemId } = event.payload;
      if (!this.lessonItemIds(unit, lesson).includes(itemId) || !unit.items.some((item) => item.id === itemId)) return "unknown_item";
    }
    if (event.kind === "unit_test_submitted") {
      const { attemptId, answers } = event.payload;
      if (this.s.unitTestIds.includes(attemptId) || this.firstTestEvents.get(attemptId) !== event.clientEventId) return "duplicate_test_attempt";
      const graded = gradeUnitTest(unit, answers, this.tolerance());
      if (!graded.valid) return graded.reason === "unknown_item" ? "unknown_item" : "invalid_payload";
    }
    return null;
  }

  private progressOf(unit: Unit): StateUnitProgress {
    const progress = (this.s.unitProgress[unit.id] ??= { version: unit.version, steps: {}, bestScore: null, testAttempts: 0, passedAt: null, passedVersion: null });
    progress.version = unit.version;
    this.touchedUnits.add(unit.id);
    return progress;
  }

  /**
   * A step is proven when it is already recorded, or when `stepValidated` holds on the attempts the server knows for
   * this lesson and this version of the unit (the state's, then the batch's processed so far, in instant order).
   */
  private unitStepProven(event: Extract<Parsed, { kind: "unit_step_completed" }>): boolean {
    const p = event.payload;
    const unit = this.s.units[p.unitId] as Unit;
    if (this.s.unitProgress[p.unitId]?.steps[`${p.lesson}:${p.step}`]) return true;
    const attempts = (this.s.unitAttempts[p.unitId] ?? [])
      .filter((attempt) => attempt.lesson === p.lesson && attempt.version === unit.version)
      .sort((a, b) => byKey(a.occurredAt, b.occurredAt));
    return stepValidated(unit, p.lesson, p.step, attempts);
  }

  /**
   * An item of a lesson: graded by the server, an `attempt` row, and `focus.*` XP the first time this account gets the
   * item right (2 at the first try, 1 at the second), never again, and never for a unit already passed. Caps: those of
   * the workshop, the "session" being the (unit, lesson) pair, the 40 XP a day shared with the sessions.
   */
  private onUnitItem(event: Extract<Parsed, { kind: "unit_item_attempt" }>, at: Attributed): void {
    const p = event.payload;
    const unit = this.s.units[p.unitId] as Unit;
    const item = unit.items.find((entry) => entry.id === p.itemId) as Unit["items"][number];
    const graded = gradeUnitItem(unit.language, item, p.answer, this.tolerance());
    const progress = this.progressOf(unit);
    const history = (this.s.unitAttempts[unit.id] ??= []);
    const tried = history.filter((attempt) => attempt.itemId === item.id);
    let xpReason: string | null = null;
    if (graded.correct) {
      if (tried.some((attempt) => attempt.correct) || progress.passedAt !== null) xpReason = "already_earned";
      else {
        // Never right before: every earlier try of the item was wrong. The try number is counted by the server from the
        // known attempts; the client's `try` is never trusted for XP.
        const attempt = tried.length + 1;
        const proof = { attempt, correct: true, firstWrong: tried.length > 0, alreadyPassedToday: false };
        const outcome = attempt === 1 ? focusFirstTry(proof) : focusSecondTry(proof);
        if (outcome.amount > 0) {
          const d = this.day(at.day);
          const key = `unit:${unit.id}:${p.lesson}`;
          const granted = capFocus(outcome.amount, { xpSession: d.focusBySession[key] ?? 0, xpDay: this.xpToday(at.day, (reason) => reason.startsWith("focus.")) });
          if (granted.amount > 0) {
            d.focusBySession[key] = (d.focusBySession[key] ?? 0) + granted.amount;
            this.emitXp({ rule: outcome.rule, amount: granted.amount, source: { kind: "attempt", id: event.clientEventId }, language: unit.language, at });
          } else xpReason = granted.zero;
        } else xpReason = outcome.zero;
      }
    }
    this.zero(event.clientEventId, xpReason);
    history.push({ lesson: p.lesson, itemId: item.id, try: p.try, correct: graded.correct, occurredAt: event.occurredAt, version: unit.version });
    this.out.attempts.push({
      client_event_id: event.clientEventId,
      session_id: null,
      language: unit.language,
      step: "unit",
      exercise_kind: `unit_${item.kind}`,
      exercise_ref: deterministicUuid(`unit:${unit.id}:${item.id}`),
      answer: { value: p.answer, try: p.try, unitId: unit.id, unitVersion: unit.version, lesson: p.lesson, itemId: item.id },
      result: { verdict: graded.correct ? (graded.nearMiss ? "almost" : "right") : "wrong", try: p.try, ...(xpReason ? { xpReason } : {}) },
      correct: graded.correct,
      duration_ms: Math.min(Math.max(0, event.occurredMs - Date.parse(p.shownAt)), MAX_ANSWER_MS),
      occurred_at: event.occurredAt,
    });
  }

  /** A step proven by the attempts (checked in `handle`): recorded once; `l1:key_phrases` turns the key phrases into cards. No XP. */
  private onUnitStep(event: Extract<Parsed, { kind: "unit_step_completed" }>, at: Attributed): void {
    const p = event.payload;
    const unit = this.s.units[p.unitId] as Unit;
    const progress = this.progressOf(unit);
    const key = `${p.lesson}:${p.step}`;
    if (progress.steps[key]) return;
    progress.steps[key] = event.occurredAt;
    if (key === KEY_PHRASES_STEP) this.createKeyPhraseCards(unit, at, event.clientEventId);
  }

  /**
   * The key phrases become `chunk` cards of source `unit`: front the phrase, back its translation in the explanation
   * language of the learner, context the line of the dialogue it comes from. A front the learner already has is skipped.
   * Like the workshop words, they are due the next learning day and count in `newCards` when first reviewed.
   */
  private createKeyPhraseCards(unit: Unit, at: Attributed, eventId: string): void {
    // A writing unit has no key phrases (and no `key_phrases` step), so there is nothing to turn into cards.
    if (isScriptUnit(unit)) return;
    const backLanguage = this.s.profile.explanationLanguage;
    for (const phrase of unit.keyPhrases) {
      const fingerKey = cardFingerKey(unit.language, "chunk", phrase.text);
      if (this.hasCard(fingerKey)) continue;
      const line = phrase.lineId === null ? undefined : unit.dialogue.lines.find((entry) => entry.id === phrase.lineId);
      this.insertCard(fingerKey, {
        language: unit.language,
        kind: "chunk",
        front: phrase.text,
        back: phrase.translation[backLanguage],
        backLanguage,
        context: line?.text ?? null,
        source: "unit",
        payload: { unitId: unit.id, keyPhraseId: phrase.id },
      }, at, eventId);
    }
  }

  /**
   * A test submission: graded by the server, a `unit_test` row, the attempt counted and the best score kept. The first
   * pass records `passedAt` and earns `unit.complete` (25 XP, 2 units a learning day; beyond, 0 with `cap_reached`).
   * The steps need not have been done.
   */
  private onUnitTest(event: Extract<Parsed, { kind: "unit_test_submitted" }>, at: Attributed): void {
    const p = event.payload;
    const unit = this.s.units[p.unitId] as Unit;
    const graded = gradeUnitTest(unit, p.answers, this.tolerance());
    if (!graded.valid) return; // refused in `precheck`
    const progress = this.progressOf(unit);
    progress.testAttempts++;
    progress.bestScore = Math.max(progress.bestScore ?? 0, graded.score);
    this.s.unitTestIds.push(p.attemptId);
    this.out.unit_tests.push({ id: p.attemptId, unit_id: unit.id, version: unit.version, client_event_id: event.clientEventId, score: graded.score, passed: graded.passed, missed: graded.missed });
    const outcome = unitComplete({ passed: graded.passed, alreadyPassed: progress.passedAt !== null });
    if (graded.passed && progress.passedAt === null) {
      progress.passedAt = event.occurredAt;
      progress.passedVersion = unit.version;
    }
    if (outcome.amount > 0) {
      const d = this.day(at.day);
      const granted = capCount(outcome.amount, { rewardsToday: d.rewards["unit.complete"] ?? 0, max: COUNT_CAPS["unit.complete"] as number });
      if (granted.amount > 0) {
        d.rewards["unit.complete"] = (d.rewards["unit.complete"] ?? 0) + 1;
        this.emitXp({ rule: "unit.complete", amount: granted.amount, source: null, language: unit.language, at, ref: unit.id });
      } else this.zero(event.clientEventId, granted.zero);
    } else this.zero(event.clientEventId, outcome.zero);
  }

  /** One `unit_progress` row per unit the batch touched, with its whole state (SQL merges it with the stored row). */
  private finishUnits(): void {
    for (const unitId of [...this.touchedUnits].sort(byKey)) {
      const unit = this.s.units[unitId] as Unit;
      const progress = this.s.unitProgress[unitId] as StateUnitProgress;
      this.out.unit_progress.push({
        unit_id: unitId,
        language: unit.language,
        version: progress.version,
        steps: { ...progress.steps },
        best_score: progress.bestScore,
        test_attempts: progress.testAttempts,
        passed_at: progress.passedAt,
        passed_version: progress.passedVersion,
      });
    }
  }

  // ------------------------------------------------------------ settlements

  private productionSimilarity(production: StateProduction): number {
    const session = production.sessionId ? this.s.sessions[production.sessionId] : undefined;
    const source = session?.readingTextId ? this.s.texts[session.readingTextId]?.body : undefined;
    const previous = this.s.recentProductionTexts;
    const ownIndex = previous.findIndex(({ id }) => id === production.id);
    const others = [
      ...(source ? [source] : []),
      ...Object.values(this.s.corrections).filter((c) => c.productionId !== production.id).map((c) => c.nativeVersion),
      ...previous.slice(ownIndex + 1).map(({ text }) => text),
    ];
    return Math.max(0, ...others.map((other) => trigramSimilarity(production.language, production.text, other)));
  }

  private productionVerdict(production: StateProduction, correction?: IngestState["corrections"][string]) {
    const level = this.s.profile.writingLevels[production.language] ?? "B1";
    return productionRejection({
      words: countWords(production.language, production.text), minWords: PRODUCTION_MIN_WORDS[level],
      detectedLanguage: correction?.detectedLanguage ?? null, targetLanguage: production.language,
      similarity: production.initialSimilarity ?? this.productionSimilarity(production),
    });
  }

  private productionHasEligibilityEvidence(production: StateProduction): boolean {
    // An expired memo cannot turn a previously rejected copy into a new source of XP.
    return !production.creditExpired || production.initialSimilarity !== undefined;
  }

  /** Productions: acceptance for the step, and `production.corrected` once the correction is in the state. */
  private settleProductions(): void {
    for (const production of Object.values(this.s.productions).sort((a, b) => byKey(a.id, b.id))) {
      const session = production.sessionId ? this.s.sessions[production.sessionId] : undefined;
      const correction = Object.values(this.s.corrections).find((c) => c.productionId === production.id);
      const recurring = correction && Object.values(this.s.items).find((item) =>
        item.errorOfDay?.correctionId === correction.id && item.errorOfDay.recurring && item.errorOfDay.createdDay === this.serverDay);
      const isNew = this.out.productions.some((row) => row.id === production.id);
      const defer = production.correctionDeferred && session?.steps.expression?.proof.correctionDeferred !== true;
      if (!isNew && !correction && !defer) continue;
      const rejection = this.productionVerdict(production, correction);
      production.feedbackEligible = rejection === null && correction !== undefined && this.productionHasEligibilityEvidence(production);
      if (recurring && production.feedbackEligible) this.createCard(recurring, { ok: true, day: this.serverDay, late: false }, production.clientEventId);
      if (production.settled) continue;
      const at: Attributed = { ok: true, day: production.day, late: production.late };
      if (session) {
        const evidence = this.proof(session, "expression");
        evidence.accepted = rejection === null && this.productionHasEligibilityEvidence(production);
        evidence.correctionReceived = correction !== undefined;
        evidence.correctionDeferred = production.correctionDeferred;
        evidence.hasErrors = correction?.sentences.some((sentence) => sentence.errors.length > 0) ?? false;
        this.touchSession(session, "expression", { occurredAt: this.touchedSessions.get(session.id)?.at ?? this.now.toISOString() }, this.touchedSessions.get(session.id)?.att ?? at);
      }
      if (!correction) continue;
      production.settled = true;
      if (production.creditExpired) continue;
      const d = this.day(production.day);
      if (rejection === null) {
        const granted = capCount(15, { rewardsToday: d.rewards["production.corrected"] ?? 0, max: COUNT_CAPS["production.corrected"] as number });
        if (granted.amount > 0) {
          d.rewards["production.corrected"] = (d.rewards["production.corrected"] ?? 0) + 1;
          this.emitXp({ rule: "production.corrected", amount: granted.amount, source: null, language: production.language, at, ref: production.id });
        } else this.zero(production.clientEventId, granted.zero);
      } else this.zero(production.clientEventId, rejection);
    }
  }

  private finishSessions(): void {
    for (const [sessionId, trigger] of [...this.touchedSessions].sort(([a], [b]) => byKey(a, b))) {
      const session = this.s.sessions[sessionId] as StateSession;
      for (const step of PLAN_STEPS) {
        const entry = session.steps[step];
        const stepKey = `${session.id}:${step}`;
        if (!entry) continue;
        const proof = entry.proof;
        let ok = false;
        if (session.requiredSteps.includes(step)) {
          if (step === "wake") ok = wakeValidated(this.wakeItems(session), session.wakeBudgetMinutes, { answered: (proof.answered as string[] | undefined) ?? [], ms: (proof.ms as number | undefined) ?? 0 });
          else if (step === "reading") ok = this.s.texts[session.readingTextId ?? ""] ? readingValidated((this.s.texts[session.readingTextId as string] as { wordCount: number }).wordCount, this.readingEvidence(session)) : false;
          else if (step === "workshop") ok = workshopValidated(session.workshopItemIds, (proof.attempted as string[] | undefined) ?? []);
          else if (step === "expression") ok = expressionValidated({ accepted: proof.accepted === true, correctionReceived: proof.correctionReceived === true, correctionDeferred: proof.correctionDeferred === true, hasErrors: proof.hasErrors === true, verifiedRewrites: (proof.verifiedRewrites as number | undefined) ?? 0 });
          else ok = proof.momentumOk === true;
        }
        if (ok && entry.validatedAt === null) {
          entry.validatedAt = trigger.at;
          this.touchedSteps.add(stepKey);
        }
        if (this.touchedSteps.has(stepKey)) this.out.session_steps.push({ session_id: session.id, step, validated_at: entry.validatedAt, proof });
      }
      // Steps that are required but never touched: validated only if there is nothing to do for them.
      for (const step of session.requiredSteps) {
        if (session.steps[step]) continue;
        const free = (step === "wake" && this.wakeItems(session).length === 0) || (step === "workshop" && session.workshopItemIds.length === 0);
        if (free) {
          session.steps[step] = { validatedAt: trigger.at, proof: {} };
          this.out.session_steps.push({ session_id: session.id, step, validated_at: trigger.at, proof: {} });
        }
      }
      const validated = PLAN_STEPS.filter((step) => session.steps[step]?.validatedAt);
      const complete = allStepsValidated(session.requiredSteps, validated);
      if (complete && session.status !== "completed") {
        session.status = "completed";
        this.newlyCompleted.add(session.id);
        session.completedAt = trigger.at;
        if (session.startedAt === null) session.startedAt = trigger.at;
        if (session.kind === "catch_up" && !trigger.att.late && !this.s.catchUpDays.includes(trigger.att.day)) this.s.catchUpDays.push(trigger.att.day);
        if (session.kind === "daily" && !trigger.att.late) this.completedDaily.set(trigger.att.day, true);
        const outcome = sessionComplete({ kind: session.kind, allStepsValidated: true });
        if (outcome.amount > 0) {
          const d = this.day(trigger.att.day);
          const granted = capCount(outcome.amount, { rewardsToday: d.rewards["session.complete"] ?? 0, max: COUNT_CAPS["session.complete"] as number });
          if (granted.amount > 0) {
            d.rewards["session.complete"] = (d.rewards["session.complete"] ?? 0) + 1;
            this.emitXp({ rule: "session.complete", amount: granted.amount, source: null, language: session.language, at: trigger.att, ref: session.id });
          }
        }
      }
      if (this.sessionRows.has(session.id) || complete) this.markSession(session);
    }
    for (const [id, row] of [...this.sessionRows].sort(([a], [b]) => byKey(a, b))) {
      this.out.sessions.push({ id, status: row.status === "planned" ? "started" : row.status, started_at: row.startedAt, completed_at: row.completedAt });
    }
  }

  // ------------------------------------------------------- days and streak

  private finishDays(): void {
    const days = new Set<DateKey>([...this.touchedDays.keys(), ...this.travelDays.keys()]);
    for (const day of [...days].sort()) {
      if (day > addDays(this.serverDay, 1)) continue;
      const touched = this.touchedDays.get(day);
      const existing = this.s.learningDays[day];
      if (!touched && existing) continue;
      const gained = sum(this.newXp.filter((line) => line.day === day && !line.late).map((line) => line.amount));
      const xpVerified = (existing?.xpVerified ?? 0) + gained;
      const sessionDone = this.completedDaily.get(day) === true || Object.values(this.s.sessions).some((s) => s.kind === "daily" && s.status === "completed" && s.day === day && !this.newlyCompleted.has(s.id));
      const validated = xpVerified >= STREAK_VALIDATION_XP || sessionDone;
      const cause = validated ? (xpVerified >= STREAK_VALIDATION_XP ? "work" : "session") : touched ? "none" : "travel";
      if (existing && existing.validated === validated && existing.xpVerified === xpVerified && existing.cause === cause && !touched) continue;
      const row = {
        day,
        timeZone: existing?.timeZone ?? touched?.timeZone ?? (this.travelDays.get(day) as string),
        xpVerified,
        validated,
        cause,
        firstActivityAt: touched ? (existing?.firstActivityAt && existing.firstActivityAt < touched.firstActivityAt ? existing.firstActivityAt : touched.firstActivityAt) : (existing?.firstActivityAt ?? null),
      };
      this.s.learningDays[day] = row;
      this.out.learning_days.push({ day, time_zone: row.timeZone, xp_verified: xpVerified, validated, cause: cause as IngestPayload["learning_days"][number]["cause"], first_activity_at: row.firstActivityAt });
    }
  }

  private finishStreak(): void {
    if (this.out.learning_days.length === 0) return;
    const rows = Object.values(this.s.learningDays);
    const history = buildSettingsHistory(this.s.settingChanges, this.s.profile.defaultRingTier);
    const today = learningDay(this.now, timeZoneAt(this.journal, this.now, this.s.profile.timeZone));
    const firstDay = rows.map((row) => row.day).sort()[0] as DateKey;
    const result = recomputeStreak({
      status: dayStatuses(rows),
      history,
      catchUps: this.s.catchUpDays,
      weekGoalMet: (monday) => weekProgress({ monday, tier: history.tierAt(monday), ringEnabled: history.ringEnabledAt(monday), xpByDay: (day) => this.s.learningDays[day]?.xpVerified ?? 0 }).met,
      firstDay,
      today,
    });
    const weekly = history.modeAt(today) === "weekly";
    this.out.streak = {
      current: weekly ? result.currentWeeks : result.current,
      best: weekly ? result.bestWeeks : result.best,
      last_day: result.lastDay,
      freezes: result.freezes,
      mode: history.modeAt(today),
      last_repair_day: result.lastRepairDay,
      freezes_granted_through: result.freezesGrantedThrough,
      best_set_on: result.bestSetOn,
      time_zone_changed_at: this.lastChangeAt ? this.lastChangeAt.toISOString() : null,
    };
    this.s.streak = { timeZoneChangedAt: this.out.streak.time_zone_changed_at };
    const since = addDays(today, -3);
    this.report.streakEvents = result.events.filter((event) => event.day >= since);
  }

  private finishCursors(valid: Parsed[]): void {
    const latest = new Map<string, { seq: number; day: DateKey }>();
    for (const event of valid) {
      const at = this.att.get(event.clientEventId);
      if (!at) continue;
      const known = latest.get(event.payload.deviceId);
      latest.set(event.payload.deviceId, { seq: Math.max(known?.seq ?? -1, event.payload.seq), day: known && known.day > at.day ? known.day : at.day });
    }
    for (const [deviceId, value] of [...latest].sort(([a], [b]) => byKey(a, b))) {
      const cursor = this.s.deviceCursors[deviceId];
      const lastSeq = Math.max(cursor?.lastSeq ?? -1, value.seq);
      const lastDay = cursor && cursor.lastDay > value.day ? cursor.lastDay : value.day;
      if (cursor && cursor.lastSeq === lastSeq && cursor.lastDay === lastDay) continue;
      this.s.deviceCursors[deviceId] = { lastSeq, lastDay };
      this.out.device_cursors.push({ device_id: deviceId, last_seq: lastSeq, last_day: lastDay });
    }
  }
}

/** `language|kind|front` lower-cased: how `cardFronts` names a card. */
function cardFingerKey(language: string, kind: string, front: string): string {
  return `${language}|${kind}|${front.toLowerCase()}`;
}

function compareEvents(a: Parsed, b: Parsed): number {
  return a.occurredMs - b.occurredMs || byKey(a.payload.deviceId, b.payload.deviceId) || a.payload.seq - b.payload.seq || byKey(a.clientEventId, b.clientEventId);
}
