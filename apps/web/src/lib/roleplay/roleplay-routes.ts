import {
  languageCodeSchema, roleplayResponseSchema, roleplayStartRequestSchema, roleplayTurnRequestSchema,
  type RoleplayResponse, type RoleplayStartRequest, type RoleplayTurnRequest,
} from "@dailylingua/schemas";
import { z } from "zod";
import { isSameOrigin, readBodyLimited } from "@/lib/ingest/events-route";
import { ACCOUNT_HEADER } from "@/lib/offline/account";

/**
 * The HTTP side of the role play (`j5-pr3-jeu-de-role.md` §2): origin, user and account header, body, then the service.
 * Dependencies are injected: the route files bind the real ones, the tests fakes. A failure never carries the text of
 * the learner or of the model: the answer is a status and nothing else.
 */

const statusCodes: Record<RoleplayResponse["status"], number> = {
  state: 200,
  ready: 200,
  active_exists: 409,
  game_over: 409,
  limit: 429,
  invalid_scenario: 422,
  invalid_turn: 422,
  not_found: 404,
  disabled: 503,
  failed: 502,
  unavailable: 503,
  unauthenticated: 401,
  forbidden: 403,
};

/** A turn is 300 characters at most (and a few more bytes of JSON): anything bigger is not a turn. */
const MAX_BODY_BYTES = 4096;

function json(body: RoleplayResponse): Response {
  return Response.json(roleplayResponseSchema.parse(body), { status: statusCodes[body.status], headers: { "Cache-Control": "private, no-store" } });
}

export interface RoleplayRouteDeps {
  getUser(): Promise<{ id: string; isGuest?: boolean } | null>;
  state(caller: Caller, language: string): Promise<RoleplayResponse>;
  start(caller: Caller, request: RoleplayStartRequest): Promise<RoleplayResponse>;
  turn(caller: Caller, gameId: string, request: RoleplayTurnRequest): Promise<RoleplayResponse>;
  finish(caller: Caller, gameId: string): Promise<RoleplayResponse>;
}

interface Caller {
  userId: string;
  isGuest?: boolean;
}

async function authenticate(request: Request, deps: RoleplayRouteDeps): Promise<Caller | RoleplayResponse> {
  const user = await deps.getUser();
  if (!user || request.headers.get(ACCOUNT_HEADER) !== user.id) return { status: "unauthenticated" };
  return { userId: user.id, ...(user.isGuest ? { isGuest: true } : {}) };
}

const isResponse = (value: Caller | RoleplayResponse): value is RoleplayResponse => "status" in value;

async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T | null> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  const body = await readBodyLimited(request, MAX_BODY_BYTES);
  if (!body.ok) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(body.text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function createRoleplayHandlers(deps: RoleplayRouteDeps) {
  const guarded = (request: Request, run: (caller: Caller) => Promise<RoleplayResponse>, options: { write: boolean }) =>
    (async () => {
      if (options.write && !isSameOrigin(request)) return json({ status: "forbidden" });
      try {
        const caller = await authenticate(request, deps);
        return json(isResponse(caller) ? caller : await run(caller));
      } catch {
        // Internal exceptions and the model's output can contain the learner's text.
        return json({ status: "unavailable" });
      }
    })();

  return {
    /** `GET /api/roleplay?language=it`: the game in progress, today's game and the scenarios to offer. */
    state(request: Request): Promise<Response> {
      const language = languageCodeSchema.safeParse(new URL(request.url).searchParams.get("language"));
      if (!language.success) return Promise.resolve(json({ status: "not_found" }));
      return guarded(request, (caller) => deps.state(caller, language.data), { write: false });
    },

    /** `POST /api/roleplay` `{ scenarioId, language }`: starts a game, the character speaks first. */
    start(request: Request): Promise<Response> {
      return guarded(request, async (caller) => {
        const body = await readJson(request, roleplayStartRequestSchema);
        return body ? deps.start(caller, body) : { status: "invalid_scenario" };
      }, { write: true });
    },

    /** `POST /api/roleplay/[id]/turns` `{ text, via }`. */
    turn(request: Request, gameId: string): Promise<Response> {
      if (!z.uuid().safeParse(gameId).success) return Promise.resolve(json({ status: "not_found" }));
      return guarded(request, async (caller) => {
        const body = await readJson(request, roleplayTurnRequestSchema);
        return body ? deps.turn(caller, gameId.toLowerCase(), body) : { status: "invalid_turn" };
      }, { write: true });
    },

    /** `POST /api/roleplay/[id]/finish`. */
    finish(request: Request, gameId: string): Promise<Response> {
      if (!z.uuid().safeParse(gameId).success) return Promise.resolve(json({ status: "not_found" }));
      return guarded(request, (caller) => deps.finish(caller, gameId.toLowerCase()), { write: true });
    },
  };
}
