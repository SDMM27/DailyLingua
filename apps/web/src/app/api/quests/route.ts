import { getQuestsRequest } from "@/lib/quests/overview";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return getQuestsRequest(request, getSupabaseServiceClient);
}
