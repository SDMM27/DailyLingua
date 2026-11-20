import { readRewriteResult } from "@dailylingua/data";
import { z } from "zod";
import { ACCOUNT_HEADER } from "@/lib/offline/account";
import { getSessionUser } from "@/lib/session";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const headers = { "Cache-Control": "private, no-store" };
const idSchema = z.uuid();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user || request.headers.get(ACCOUNT_HEADER) !== user.id) {
      return Response.json({ error: "unauthenticated" }, { status: 401, headers });
    }
    const id = idSchema.safeParse((await params).id);
    const event = idSchema.safeParse(new URL(request.url).searchParams.get("event"));
    const result = id.success && event.success ? await readRewriteResult(getSupabaseServiceClient(), user.id, id.data, event.data) : null;
    return result
      ? Response.json(result, { headers })
      : Response.json({ error: "not_found" }, { status: 404, headers });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
}
