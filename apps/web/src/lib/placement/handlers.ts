import { levelToValue, placementUncertainty, replayPlacement } from "@dailylingua/core";
import { placementBankOf } from "@dailylingua/content/placement";
import { listEnrollments, recordPlacementResult, type AppClient } from "@dailylingua/data";
import { completePlacementInput } from "@dailylingua/schemas";
import { isSameOrigin, readBodyLimited } from "@/lib/ingest/events-route";
import { ACCOUNT_HEADER } from "@/lib/offline/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** 30 answers of about 40 bytes each. */
const MAX_BODY_BYTES = 4096;

/** The service-role client is handed in by the route (only API routes import it). */
type GetService = () => AppClient;

const empty = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });

/** The signed-in learner whose account header matches the session, with their own client; null otherwise. */
async function sessionUser(request: Request) {
  const client = await createSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || request.headers.get(ACCOUNT_HEADER) !== user.id) return null;
  return { client, user };
}

/**
 * `POST /api/placement`: saves a finished placement test. The client sends its answers and the level it keeps; the
 * server replays the answers against the bank (a tampered or incomplete sequence is refused with 422) and computes
 * the estimate and the confidence itself. The writes go through the service role, filtered on the session's user.
 */
export async function completePlacement(request: Request, getService: GetService): Promise<Response> {
  if (!isSameOrigin(request)) return empty(403);
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return empty(415);
  const body = await readBodyLimited(request, MAX_BODY_BYTES);
  if (!body.ok) return empty(body.reason === "too_large" ? 413 : 400);
  let json: unknown;
  try {
    json = JSON.parse(body.text);
  } catch {
    return empty(400);
  }
  const parsed = completePlacementInput.safeParse(json);
  if (!parsed.success) return empty(400);
  const test = parsed.data;
  const bank = placementBankOf(test.language);
  if (!bank) return empty(400);
  try {
    const session = await sessionUser(request);
    if (!session) return empty(401);
    const enrollments = await listEnrollments(session.client);
    if (!enrollments.some(({ language }) => language === test.language)) return empty(400);
    const replay = replayPlacement(bank.items, test.startLevel, test.answers);
    if (!replay.ok) {
      console.error(`Placement test refused (${test.language}): ${replay.reason}`);
      return empty(422);
    }
    await recordPlacementResult(getService(), session.user.id, {
      language: test.language,
      startLevel: test.startLevel,
      estimatedLevel: replay.estimate,
      confidence: replay.confidence,
      chosenLevel: test.chosenLevel,
      // The replay checked that every answer is a question of the bank.
      answers: test.answers.map(({ itemId, choice }) => ({
        itemId, choice, correct: bank.items.find((item) => item.id === itemId)?.answer === choice,
      })),
      bankVersion: bank.version,
      takenAt: new Date().toISOString(),
      reading: { levelValue: levelToValue(test.chosenLevel), uncertainty: placementUncertainty(replay.confidence) },
    });
    return Response.json({ estimate: replay.estimate, confidence: replay.confidence }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Saving a placement test failed", error);
    return empty(503);
  }
}
