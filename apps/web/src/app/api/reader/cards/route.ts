import { deterministicUuid } from "@dailylingua/core";
import { getProfile, listEnrollments, readReaderText, saveReaderCard } from "@dailylingua/data";
import { z } from "zod";
import { isSameOrigin, readBodyLimited } from "@/lib/ingest/events-route";
import { ACCOUNT_HEADER } from "@/lib/offline/account";
import { readerWords } from "@/lib/reader/words";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const selection = z.object({ textId: z.uuid(), from: z.int().min(0) });
const empty = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return empty(403);
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return empty(415);
  const body = await readBodyLimited(request, 512);
  if (!body.ok) return empty(body.reason === "too_large" ? 413 : 400);
  let input: unknown;
  try {
    input = JSON.parse(body.text);
  } catch {
    return empty(400);
  }
  const parsed = selection.safeParse(input);
  if (!parsed.success) return empty(400);
  try {
    const client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user || request.headers.get(ACCOUNT_HEADER) !== user.id) return empty(401);
    const [text, profile, enrollments] = await Promise.all([
      readReaderText(client, parsed.data.textId), getProfile(client), listEnrollments(client),
    ]);
    if (!text || !profile || !enrollments.some(({ language }) => language === text.language)) return empty(404);
    const word = readerWords(text.body, text.new_words, text.language, profile.nativeLanguage)
      .find(({ from }) => from === parsed.data.from);
    if (!word) return empty(404);
    await saveReaderCard(getSupabaseServiceClient(), {
      id: deterministicUuid(`reader-card:${user.id}:${text.id}:${word.from}`),
      userId: user.id, language: text.language, front: word.front, back: word.meaning,
      backLanguage: word.meaningLanguage, context: word.context, textId: text.id, from: word.from,
    });
    return empty(204);
  } catch (error) {
    console.error("Saving a reader card failed", error);
    return empty(503);
  }
}
