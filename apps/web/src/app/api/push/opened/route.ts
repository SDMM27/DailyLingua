import { markReminderOpened } from "@dailylingua/data";
import { z } from "zod";
import { isSameOrigin, readBodyLimited } from "@/lib/ingest/events-route";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "no-store" };
const openSchema = z.strictObject({ id: z.number().int().positive() });

export async function POST(request: Request) {
  if (!isSameOrigin(request) || request.headers.get("content-type") !== "application/json") {
    return new Response(null, { status: 403, headers });
  }
  const body = await readBodyLimited(request, 128);
  if (!body.ok) return new Response(null, { status: 400, headers });
  try {
    const opened = openSchema.safeParse(JSON.parse(body.text));
    if (!opened.success) return new Response(null, { status: 400, headers });
    const client = await createSupabaseServerClient();
    const { data } = await client.auth.getUser();
    if (!data.user) return new Response(null, { status: 401, headers });
    await markReminderOpened(client, opened.data.id);
    return new Response(null, { status: 204, headers });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
