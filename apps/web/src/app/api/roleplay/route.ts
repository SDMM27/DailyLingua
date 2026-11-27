import { roleplayHandlers } from "./_handlers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return roleplayHandlers.state(request);
}

export async function POST(request: Request) {
  return roleplayHandlers.start(request);
}
