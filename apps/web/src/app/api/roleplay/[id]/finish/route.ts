import { roleplayHandlers } from "../../_handlers";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return roleplayHandlers.finish(request, (await context.params).id);
}
