import { addDays, learningDay } from "@dailylingua/core";
import {
  type AppClient, countImmersionOnDay, createImmersion, deleteImmersion, getImmersion, getProfile, listEnrollments, updateImmersion,
} from "@dailylingua/data";
import { immersionEntryInput, type ImmersionEntryInput } from "@dailylingua/schemas";
import { z } from "zod";
import { isSameOrigin, readBodyLimited } from "@/lib/ingest/events-route";
import { ACCOUNT_HEADER } from "@/lib/offline/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_BODY_BYTES = 4096;
/** How far back a day can be declared, in days. */
const MAX_DAYS_BACK = 30;
/** Entries per account and per day. */
const MAX_ENTRIES_PER_DAY = 50;

/** The service-role client is handed in by the route (only API routes import it). */
type GetService = () => AppClient;

const idSchema = z.uuid();
const empty = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });

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

/** 400 when the language is not one of the account's, or the day is in the future or too far back (the profile's time zone). */
async function checkLanguageAndDay(client: Awaited<ReturnType<typeof createSupabaseServerClient>>, input: ImmersionEntryInput) {
  const [profile, enrollments] = await Promise.all([getProfile(client), listEnrollments(client)]);
  if (!profile || !enrollments.some(({ language }) => language === input.language)) return empty(400);
  const today = learningDay(new Date(), profile.timeZone);
  if (input.day > today || input.day < addDays(today, -MAX_DAYS_BACK)) return empty(400);
  return null;
}

export async function createEntry(request: Request, getService: GetService): Promise<Response> {
  if (!isSameOrigin(request)) return empty(403);
  const input = await readEntry(request);
  if (input instanceof Response) return input;
  try {
    const session = await sessionUser(request);
    if (!session) return empty(401);
    const invalid = await checkLanguageAndDay(session.client, input);
    if (invalid) return invalid;
    const service = getService();
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
    const invalid = await checkLanguageAndDay(session.client, input);
    if (invalid) return invalid;
    const service = getService();
    const current = await getImmersion(service, session.user.id, id.data);
    if (!current) return empty(404);
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
    return await deleteImmersion(getService(), session.user.id, id.data) ? empty(204) : empty(404);
  } catch (error) {
    console.error("Deleting an immersion entry failed", error);
    return empty(503);
  }
}
