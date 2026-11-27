import { QUEST_CATALOG_VERSION, addDays, learningDay, pickReroll, questById, resolveGameSettings } from "@dailylingua/core";
import { getGameContext, listQuestAssignments, listQuestLedgerLines, rerollQuest, type AppClient } from "@dailylingua/data";
import { gameSettingsSchema } from "@dailylingua/schemas";
import { z } from "zod";
import { isSameOrigin, readBodyLimited } from "@/lib/ingest/events-route";
import { ACCOUNT_HEADER } from "@/lib/offline/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { choiceBase } from "./refresh";

const MAX_BODY_BYTES = 1024;
const bodySchema = z.strictObject({ assignmentId: z.uuid() });
const empty = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });

/**
 * `POST /api/quests/reroll` `{ assignmentId }`: replaces one unfinished quest of the day by another, once a day. Order of the
 * guards: same origin, JSON, body of 1 KiB at most, session and account header, then the state (409 when the reroll is spent or the quest done).
 */
export async function rerollQuestRequest(request: Request, getService: () => AppClient): Promise<Response> {
  if (!isSameOrigin(request)) return empty(403);
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return empty(415);
  const body = await readBodyLimited(request, MAX_BODY_BYTES);
  if (!body.ok) return empty(body.reason === "too_large" ? 413 : 400);
  let input: z.infer<typeof bodySchema>;
  try {
    const parsed = bodySchema.safeParse(JSON.parse(body.text));
    if (!parsed.success) return empty(400);
    input = parsed.data;
  } catch {
    return empty(400);
  }
  try {
    const client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user || request.headers.get(ACCOUNT_HEADER) !== user.id) return empty(401);
    const service = getService();
    const context = await getGameContext(service, user.id);
    if (!context) return empty(404);
    if (!resolveGameSettings(gameSettingsSchema.safeParse(context.gameSettings).data).quests.enabled) return empty(409);

    const today = learningDay(new Date(), context.timeZone);
    const assignments = await listQuestAssignments(service, user.id, addDays(today, -3));
    const todays = assignments.filter((row) => row.period === "day" && row.periodStart === today);
    const target = todays.find((row) => row.id === input.assignmentId);
    if (!target) return empty(404);
    if (target.completedAt !== null || todays.some((row) => row.rerolledFrom !== null)) return empty(409);

    const [base, lines] = await Promise.all([choiceBase(service, user.id, today), listQuestLedgerLines(service, user.id, addDays(today, -14), today)]);
    const next = pickReroll({
      ...base, period: "day", periodStart: today, recentLines: lines.filter((line) => line.day < today),
      recentQuestIds: assignments.filter((row) => row.period === "day" && row.periodStart < today).map((row) => row.questId),
    }, target.questId, todays.map((row) => row.questId));
    const quest = next ? questById(next) : undefined;
    if (!quest) return empty(409);
    if (!(await rerollQuest(service, user.id, target.id, quest.id, quest.target, QUEST_CATALOG_VERSION))) return empty(409);
    return Response.json({ questId: quest.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Rerolling a quest failed", error);
    return empty(503);
  }
}
