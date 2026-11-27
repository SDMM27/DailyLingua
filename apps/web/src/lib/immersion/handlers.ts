import { isImmersionDayClosed, learningDay } from "@dailylingua/core";
import {
  type AppClient, countImmersionOnDay, createImmersion, deleteImmersion, getImmersion, getProfile, isImmersionDayRecorded, listEnrollments, updateImmersion,
} from "@dailylingua/data";
import { immersionEntryInput, type ImmersionEntryInput } from "@dailylingua/schemas";
import { z } from "zod";
import { isSameOrigin, readBodyLimited } from "@/lib/ingest/events-route";
import { ACCOUNT_HEADER } from "@/lib/offline/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_BODY_BYTES = 4096;
/** Entries per account and per day. */
const MAX_ENTRIES_PER_DAY = 50;

/** The service-role client is handed in by the route (only API routes import it). */
type GetService = () => AppClient;

const idSchema = z.uuid();
const empty = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });
/** A day closed for good (older than 3 days, or already settled): nothing can be created, changed or deleted on it. */
const dayClosed = () => Response.json({ error: "day_closed" }, { status: 409, headers: { "Cache-Control": "no-store" } });

/** The signed-in learner whose account header matches the session, with their own client; null otherwise. */
async function sessionUser(request: Request) {
  const client = await createSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || request.headers.get(ACCOUNT_HEADER) !== user.id) return null;
  return { client, user };
}

async function readEntry(request: Request): Promise<ImmersionEntryInput | Response> {
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return empty(415);
  const body = await readBodyLimited(request, MAX_BODY_BYTES);
  if (!body.ok) return empty(body.reason === "too_large" ? 413 : 400);
  let input: unknown;
  try {
    input = JSON.parse(body.text);
  } catch {
    return empty(400);
  }
  const parsed = immersionEntryInput.safeParse(input);
  return parsed.success ? parsed.data : empty(400);
}

/** The learning day of the account (its time zone), or null without a profile. */
async function todayOf(client: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const profile = await getProfile(client);
  return profile ? learningDay(new Date(), profile.timeZone) : null;
}

/** 409 when the day is closed: older than the editable window, or recorded in `immersion_close` whatever the time zone says. */
async function closedDay(service: AppClient, userId: string, day: string, today: string): Promise<Response | null> {
  return isImmersionDayClosed(day, today) || await isImmersionDayRecorded(service, userId, day) ? dayClosed() : null;
}

/** 400 when the language is not one of the account's or the day is in the future; 409 when the day is closed (the profile's time zone). */
async function checkLanguageAndDay(client: Awaited<ReturnType<typeof createSupabaseServerClient>>, service: AppClient, userId: string, input: ImmersionEntryInput) {
  const [today, enrollments] = await Promise.all([todayOf(client), listEnrollments(client)]);
  if (!today || !enrollments.some(({ language }) => language === input.language)) return empty(400);
  if (input.day > today) return empty(400);
  return closedDay(service, userId, input.day, today);
}

export async function createEntry(request: Request, getService: GetService): Promise<Response> {
  if (!isSameOrigin(request)) return empty(403);
  const input = await readEntry(request);
  if (input instanceof Response) return input;
  try {
    const session = await sessionUser(request);
    if (!session) return empty(401);
    const service = getService();
    const invalid = await checkLanguageAndDay(session.client, service, session.user.id, input);
    if (invalid) return invalid;
    if (await countImmersionOnDay(service, session.user.id, input.day) >= MAX_ENTRIES_PER_DAY) return empty(429);
    const id = await createImmersion(service, session.user.id, input);
    return Response.json({ id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Creating an immersion entry failed", error);
    return empty(503);
  }
}

export async function updateEntry(request: Request, rawId: string, getService: GetService): Promise<Response> {
  if (!isSameOrigin(request)) return empty(403);
  const id = idSchema.safeParse(rawId);
  if (!id.success) return empty(404);
  const input = await readEntry(request);
  if (input instanceof Response) return input;
  try {
    const session = await sessionUser(request);
    if (!session) return empty(401);
    const service = getService();
    const invalid = await checkLanguageAndDay(session.client, service, session.user.id, input);
    if (invalid) return invalid;
    const current = await getImmersion(service, session.user.id, id.data);
    if (!current) return empty(404);
    const today = await todayOf(session.client);
    if (!today) return empty(400);
    const closed = await closedDay(service, session.user.id, current.day, today);
    if (closed) return closed;
    if (current.day !== input.day && await countImmersionOnDay(service, session.user.id, input.day) >= MAX_ENTRIES_PER_DAY) return empty(429);
    return await updateImmersion(service, session.user.id, id.data, input) ? empty(204) : empty(404);
  } catch (error) {
    console.error("Updating an immersion entry failed", error);
    return empty(503);
  }
}

export async function deleteEntry(request: Request, rawId: string, getService: GetService): Promise<Response> {
  if (!isSameOrigin(request)) return empty(403);
  const id = idSchema.safeParse(rawId);
  if (!id.success) return empty(404);
  try {
    const session = await sessionUser(request);
    if (!session) return empty(401);
    const service = getService();
    const current = await getImmersion(service, session.user.id, id.data);
    if (!current) return empty(404);
    const today = await todayOf(session.client);
    if (!today) return empty(400);
    const closed = await closedDay(service, session.user.id, current.day, today);
    if (closed) return closed;
    return await deleteImmersion(service, session.user.id, id.data) ? empty(204) : empty(404);
  } catch (error) {
    console.error("Deleting an immersion entry failed", error);
    return empty(503);
  }
}
