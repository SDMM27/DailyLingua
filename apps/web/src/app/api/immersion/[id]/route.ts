import { deleteEntry, updateEntry } from "@/lib/immersion/handlers";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return updateEntry(request, (await params).id, getSupabaseServiceClient);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return deleteEntry(request, (await params).id, getSupabaseServiceClient);
}
