import { completePlacement } from "@/lib/placement/handlers";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export function POST(request: Request): Promise<Response> {
  return completePlacement(request, getSupabaseServiceClient);
}
