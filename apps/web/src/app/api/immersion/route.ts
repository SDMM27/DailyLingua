import { createEntry } from "@/lib/immersion/handlers";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export function POST(request: Request): Promise<Response> {
  return createEntry(request, getSupabaseServiceClient);
}
