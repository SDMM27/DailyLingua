import { rerollQuestRequest } from "@/lib/quests/reroll";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export function POST(request: Request): Promise<Response> {
  return rerollQuestRequest(request, getSupabaseServiceClient);
}
