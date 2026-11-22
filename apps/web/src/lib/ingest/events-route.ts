import { MAX_BATCH_BYTES, MAX_EVENTS_PER_BATCH, MAX_EVENTS_PER_HOUR, deliveryReportSchema } from "@dailylingua/schemas";
import type { IngestResult, LogFn } from "./ingest-events";
import { ACCOUNT_HEADER } from "@/lib/offline/account";

/**
 * The logic of `POST /api/events` (`j2-pr1-lot-w.md` section 6), with its dependencies injected: the route file binds
 * the real ones, the tests bind fakes. The order is the contract: origin and content type, user, body (read as a
 * stream, stopped at 64 KiB), rate, ingestion, answer. The SQL message never goes into a response.
 */

export interface EventsRouteDeps {
  /** The signed-in user, validated with Supabase Auth, or null. */
  getUser(): Promise<{ id: string; isGuest?: boolean } | null>;
  /** Takes `count` events of the hourly allowance (`limit`); false when it would be exceeded. */
  claimRate(userId: string, count: number, limit: number): Promise<boolean>;
  ingest(input: { userId: string; events: unknown[]; now: Date; isGuest?: boolean }): Promise<IngestResult>;
  now(): Date;
  log?: LogFn;
}

const HEADERS = { "Cache-Control": "no-store" } as const;
const json = (body: Record<string, unknown>, status: number, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...HEADERS, ...extra } });

/** The request comes from a page of this site: the `Origin` header is there and is this site's. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.origin === new URL(request.url).origin) return true;
  // Behind a proxy the URL the handler sees may carry an internal host: the host the browser asked for is the reference.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return host !== null && parsed.host === host;
}

/** The body as text, read chunk by chunk and abandoned past `limit` bytes (`Content-Length` is not trusted). */
export async function readBodyLimited(request: Request, limit: number): Promise<{ ok: true; text: string } | { ok: false; reason: "too_large" | "unreadable" }> {
  if (request.body === null) return { ok: true, text: "" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(bytes) };
}

/** Seconds until the next full hour (the window of the rate limit). */
export function secondsToNextHour(now: Date): number {
  return Math.max(1, Math.ceil((3_600_000 - (now.getTime() % 3_600_000)) / 1000));
}

export function createEventsHandler(deps: EventsRouteDeps): (request: Request) => Promise<Response> {
  const log: LogFn = deps.log ?? ((level, message, data) => (level === "error" ? console.error : console.warn)(`[api/events] ${message}`, data ?? {}));

  return async function POST(request: Request): Promise<Response> {
    // 1. Only a script of this site sends JSON with an Origin of this site (CSRF); a form posted from elsewhere cannot.
    if (!isSameOrigin(request)) return json({ error: "forbidden" }, 403);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ error: "unsupported_media_type" }, 415);

    // 2. The user, from the cookie, verified with Supabase Auth.
    let user: { id: string; isGuest?: boolean } | null;
    try {
      user = await deps.getUser();
    } catch (error) {
      log("error", "the user could not be read", { error: error instanceof Error ? error.message : String(error) });
      return json({ error: "unavailable" }, 503);
    }
    if (!user) return json({ error: "unauthenticated" }, 401);
    const account = request.headers.get(ACCOUNT_HEADER);
    if (account !== null && account !== user.id) return json({ error: "unauthenticated" }, 401);

    // 3. The body.
    const body = await readBodyLimited(request, MAX_BATCH_BYTES);
    if (!body.ok) return body.reason === "too_large" ? json({ error: "payload_too_large" }, 413) : json({ error: "unavailable" }, 503);
    let events: unknown;
    try {
      events = JSON.parse(body.text);
    } catch {
      return json({ error: "invalid_body" }, 400);
    }
    if (!Array.isArray(events)) return json({ error: "invalid_body" }, 400);
    if (events.length > MAX_EVENTS_PER_BATCH) return json({ error: "payload_too_large" }, 413);
    if (events.length === 0) return json({ rejected: [] }, 200);

    // 4. The hourly allowance.
    const now = deps.now();
    try {
      if (!(await deps.claimRate(user.id, events.length, MAX_EVENTS_PER_HOUR))) {
        return json({ error: "rate_limited" }, 429, { "Retry-After": String(secondsToNextHour(now)) });
      }
    } catch (error) {
      log("error", "the event rate could not be claimed", { userId: user.id, error: error instanceof Error ? error.message : String(error) });
      return json({ error: "unavailable" }, 503);
    }

    // 5. The ingestion: what fails here may succeed later (503), and says nothing of the database.
    let result: IngestResult;
    try {
      result = await deps.ingest({ userId: user.id, events, now, ...(user.isGuest ? { isGuest: true } : {}) });
    } catch (error) {
      log("error", "the ingestion failed", { userId: user.id, error: error instanceof Error ? error.message : String(error) });
      return json({ error: "unavailable" }, 503);
    }

    // 6. The delivery report.
    const report = deliveryReportSchema.safeParse(result.report);
    if (!report.success) {
      log("error", "the delivery report does not match its schema", { userId: user.id });
      return json({ error: "unavailable" }, 503);
    }
    return json(report.data, 200);
  };
}
