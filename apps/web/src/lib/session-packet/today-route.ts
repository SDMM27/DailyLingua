import { AI_PURPOSES } from "@dailylingua/ai";
import { learningDay } from "@dailylingua/core";
import {
  countCompletedShortSessions,
  insertSession,
  readIngestState,
  readLastSessionDay,
  readPlanningCards,
  readProfileAndEnrollments,
  readQuotaUsage,
  readRecentReviews,
  readSessionOfDay,
  readSkillEstimates,
  readSuspendedThrough,
  readTextCandidates,
  readTextWithItems,
  type AppClient,
  type CardRow,
  type ItemRow,
  type NewSession,
  type PacketTextRow,
  type ProfileRow,
  type EnrollmentRow,
  type SessionRow,
  type SkillEstimateRow,
  type TextCandidate,
} from "@dailylingua/data";
import { ingestMemoSchema, languageCodeSchema, sessionPacketSchema, storedSessionPlanSchema, type DateKey, type SessionPacket } from "@dailylingua/schemas";
import { formatOfMinutes } from "@/lib/ingest/format";
import { writingLevels } from "@/lib/ingest/build-state";
import type { LogFn } from "@/lib/ingest/ingest-events";
import type { GenerationResult } from "@/lib/graded-text/generate";
import { isSameOrigin } from "@/lib/ingest/events-route";
import { ACCOUNT_HEADER } from "@/lib/offline/account";
import { buildPacket } from "./build-packet";
import { pickTextCandidate, planToday } from "./plan-session";

/**
 * The logic of `GET /api/session/today?language=xx` (`j2-pr1-lot-w.md` section 7), dependencies injected. It creates the
 * session of the day once (the server decides it, the client never names its id), then answers with the packet the
 * phone runs the day with, answer keys included. The answer is never cached by HTTP: the app keeps it in IndexedDB.
 */

/** Everything the route reads and writes; the route binds the service client, the tests fake it. */
export interface TodayStore {
  profileAndEnrollments(userId: string): Promise<{ profile: ProfileRow; enrollments: EnrollmentRow[] }>;
  skillEstimates(userId: string): Promise<SkillEstimateRow[]>;
  sessionOfDay(userId: string, language: string, day: DateKey): Promise<SessionRow | null>;
  planningCards(userId: string, language: string): Promise<CardRow[]>;
  recentReviews(userId: string, since: string): Promise<{ cardId: string; rating: number; reviewedAt: string }[]>;
  lastSessionDay(userId: string, language: string): Promise<DateKey | null>;
  completedShortSessions(userId: string, language: string): Promise<number>;
  suspendedThrough(userId: string, language: string): Promise<DateKey | null>;
  ingestState(userId: string): Promise<{ seq: number; memo: unknown }>;
  textCandidates(userId: string, language: string, levelBands: readonly string[]): Promise<TextCandidate[]>;
  textWithItems(textId: string): Promise<{ text: PacketTextRow; items: ItemRow[] } | null>;
  quotaUsage(userId: string, day: DateKey, kinds: readonly string[]): Promise<Record<string, number>>;
  insertSession(session: NewSession): Promise<SessionRow>;
}

/** `service` may be a function: the client (and so the environment) is then only read when a request needs it. */
export function createTodayStore(service: AppClient | (() => AppClient)): TodayStore {
  const client = () => (typeof service === "function" ? service() : service);
  return {
    profileAndEnrollments: (userId) => readProfileAndEnrollments(client(), userId),
    skillEstimates: (userId) => readSkillEstimates(client(), userId),
    sessionOfDay: (userId, language, day) => readSessionOfDay(client(), userId, language, day),
    planningCards: (userId, language) => readPlanningCards(client(), userId, language),
    recentReviews: (userId, since) => readRecentReviews(client(), userId, since),
    lastSessionDay: (userId, language) => readLastSessionDay(client(), userId, language),
    completedShortSessions: (userId, language) => countCompletedShortSessions(client(), userId, language),
    suspendedThrough: (userId, language) => readSuspendedThrough(client(), userId, language),
    ingestState: (userId) => readIngestState(client(), userId),
    textCandidates: (userId, language, levelBands) => readTextCandidates(client(), userId, language, levelBands),
    textWithItems: (textId) => readTextWithItems(client(), textId),
    quotaUsage: (userId, day, kinds) => readQuotaUsage(client(), userId, day, kinds),
    insertSession: (session) => insertSession(client(), session),
  };
}

export interface TodayRouteDeps {
  getUser(): Promise<{ id: string } | null>;
  store: TodayStore;
  now(): Date;
  /** A fresh session id. */
  newId(): string;
  /** `connection()` of Next: the date must be the request's, never the build's. */
  connection?(): Promise<void>;
  prepareText?(options: { language: string; level: string; day: DateKey; stockAvailable(): Promise<boolean> }): Promise<GenerationResult>;
  log?: LogFn;
}

const HEADERS = { "Cache-Control": "private, no-store" } as const;
const json = (body: Record<string, unknown> | SessionPacket, status: number) => Response.json(body, { status, headers: HEADERS });

/** Whole days of review history read to find the reviews of yesterday. */
const REVIEW_LOOKBACK_DAYS = 3;
class TextPreparing extends Error {}

/** The packet of `userId` for `language` today: the stored session if there is one, else a new one. */
export async function todayPacket(deps: Pick<TodayRouteDeps, "store" | "newId" | "prepareText">, input: { userId: string; language: string; now: Date; profile: ProfileRow; enrollment: EnrollmentRow; log: LogFn }): Promise<SessionPacket | null> {
  const { store } = deps;
  const { userId, language, now, profile, enrollment, log } = input;
  const today = learningDay(now, profile.timeZone);

  let session = await store.sessionOfDay(userId, language, today);
  if (!session) {
    const [cards, reviews, lastSessionDay, completedShortSessions, suspendedThrough, state, estimates] = await Promise.all([
      store.planningCards(userId, language),
      store.recentReviews(userId, new Date(now.getTime() - REVIEW_LOOKBACK_DAYS * 86_400_000).toISOString()),
      store.lastSessionDay(userId, language),
      store.completedShortSessions(userId, language),
      store.suspendedThrough(userId, language),
      store.ingestState(userId),
      store.skillEstimates(userId),
    ]);
    // The band of the learner's writing level (B1 without an estimate), never a free string.
    const band = writingLevels(estimates)[language] ?? "B1";
    const candidates = () => store.textCandidates(userId, language, [band]);
    let candidate = pickTextCandidate(await candidates());
    if (!candidate && deps.prepareText) {
      const prepared = await deps.prepareText({ language, level: band, day: today, stockAvailable: async () => (await candidates()).length > 0 })
        .catch((error: unknown) => {
          log("warn", "graded text preparation unavailable", { error: error instanceof Error ? error.name : "unknown" });
          return "unavailable";
        });
      // Preparation can take long enough for another device to claim the session.
      session = await store.sessionOfDay(userId, language, today);
      if (!session && prepared === "busy") throw new TextPreparing();
      if (prepared === "published" || prepared === "stock") candidate = pickTextCandidate(await candidates());
    }
    if (!session) {
      const text = candidate ? await store.textWithItems(candidate.id) : null;
      const memo = ingestMemoSchema.safeParse(state.memo);
      const sessionId = deps.newId();
      const planned = planToday(
        {
          now,
          today,
          timeZone: profile.timeZone,
          format: formatOfMinutes(enrollment.dailyMinutes),
          cards,
          recentReviews: reviews,
          lastSessionDay,
          completedShortSessions,
          newCardsToday: memo.success ? (memo.data.days[today]?.newCards ?? 0) : 0,
          newCardsSuspendedThrough: suspendedThrough,
          text,
        },
        sessionId,
      );
      // Written once: a request that lost the race gets the winner's row back and builds the packet from it.
      session = await store.insertSession({ id: sessionId, userId, language, day: today, kind: planned.kind, format: planned.format, plan: planned.plan, servedAt: now.toISOString() });
    }
  }

  const plan = storedSessionPlanSchema.safeParse(session.plan);
  if (!plan.success) {
    log("error", "the stored plan of today's session is unreadable", { userId, sessionId: session.id });
    return null;
  }
  const [cards, textBundle, usage] = await Promise.all([
    store.planningCards(userId, language),
    plan.data.reading.textId ? store.textWithItems(plan.data.reading.textId) : Promise.resolve(null),
    store.quotaUsage(userId, today, [AI_PURPOSES.writing_feedback.quotaKind, AI_PURPOSES.rewrite_check.quotaKind]),
  ]);
  return buildPacket({
    session,
    plan: plan.data,
    textBundle,
    cards: new Map(cards.map((card) => [card.id, card])),
    quotas: {
      writingFeedback: { used: usage[AI_PURPOSES.writing_feedback.quotaKind] ?? 0, limit: AI_PURPOSES.writing_feedback.dailyLimit },
      rewriteCheck: { used: usage[AI_PURPOSES.rewrite_check.quotaKind] ?? 0, limit: AI_PURPOSES.rewrite_check.dailyLimit },
    },
    serverDay: today,
    timeZone: profile.timeZone,
    now,
  });
}

export function createTodayHandler(deps: TodayRouteDeps): (request: Request) => Promise<Response> {
  const log: LogFn = deps.log ?? ((level, message, data) => (level === "error" ? console.error : console.warn)(`[api/session/today] ${message}`, data ?? {}));

  return async function serveToday(request: Request): Promise<Response> {
    const canPrepare = request.method === "POST";
    if (canPrepare && !isSameOrigin(request)) return json({ error: "forbidden" }, 403);
    try {
      const user = await deps.getUser();
      if (!user) return json({ error: "unauthenticated" }, 401);
      const account = request.headers.get(ACCOUNT_HEADER);
      if (account !== null && account !== user.id) return json({ error: "unauthenticated" }, 401);
      await deps.connection?.();

      // The language must be an active enrollment of the learner: anything else is "not found", whatever it looks like.
      const asked = languageCodeSchema.safeParse(new URL(request.url).searchParams.get("language"));
      const { profile, enrollments } = await deps.store.profileAndEnrollments(user.id);
      const enrollment = asked.success ? enrollments.find((entry) => entry.language === asked.data) : undefined;
      if (!asked.success || !enrollment) return json({ error: "not_found" }, 404);

      const now = deps.now();
      const packet = await todayPacket({ ...deps, prepareText: canPrepare ? deps.prepareText : undefined }, { userId: user.id, language: asked.data, now, profile, enrollment, log });
      if (!packet) return json({ error: "unavailable" }, 503);
      const checked = sessionPacketSchema.safeParse(packet);
      if (!checked.success) {
        log("error", "the packet does not match its schema", { userId: user.id, issue: checked.error.issues[0]?.message, path: checked.error.issues[0]?.path.join(".") });
        return json({ error: "unavailable" }, 503);
      }
      return json(checked.data, 200);
    } catch (error) {
      if (error instanceof TextPreparing) {
        return Response.json({ error: "preparing_text" }, { status: 503, headers: { ...HEADERS, "Retry-After": "5" } });
      }
      // The message of the database or of a library never goes into a response.
      log("error", "the session route failed", { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) });
      return json({ error: "unavailable" }, 503);
    }
  };
}
