import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { sourceFiles } from "@/test/source-files";
import { createSupabaseServiceClient, readServiceRoleKey } from "./service";

const KEY = "k".repeat(40);

describe("readServiceRoleKey", () => {
  it("reads SUPABASE_SERVICE_ROLE_KEY, trimmed, and nothing public", () => {
    expect(readServiceRoleKey({ SUPABASE_SERVICE_ROLE_KEY: ` ${KEY} ` })).toBe(KEY);
    expect(() => readServiceRoleKey({ NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: KEY })).toThrow(/Invalid service role/);
  });

  it("fails loudly when the key is missing or too short", () => {
    expect(() => readServiceRoleKey({})).toThrow(/Invalid service role/);
    expect(() => readServiceRoleKey({ SUPABASE_SERVICE_ROLE_KEY: "short" })).toThrow();
  });
});

describe("createSupabaseServiceClient", () => {
  it("builds a client for the app schema without a persisted session", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "a".repeat(40);
    const client = createSupabaseServiceClient({ SUPABASE_SERVICE_ROLE_KEY: KEY }) as unknown as { auth: unknown; rest: { schemaName?: string } };
    expect(client.auth).toBeDefined();
    expect(client.rest.schemaName).toBe("app");
  });
});

describe("where the service role is used", () => {
  it("is read by service.ts only and imported only by the authenticated API and cron routes", () => {
    const readers = sourceFiles([".ts", ".tsx"]).filter((file) => file.text.includes("SUPABASE_SERVICE_ROLE_KEY"));
    expect(readers.map((file) => file.path)).toEqual(["lib/supabase/service.ts"]);
    const importers = sourceFiles([".ts", ".tsx"])
      .filter((file) => /from "@\/lib\/supabase\/service"/.test(file.text))
      .map((file) => file.path)
      .sort();
    expect(importers).toEqual([
      "app/api/cron/reminders/route.ts",
      "app/api/events/route.ts",
      "app/api/immersion/[id]/route.ts",
      "app/api/immersion/route.ts",
      "app/api/production/[id]/feedback/route.ts",
      "app/api/production/[id]/rewrites/route.ts",
      "app/api/quests/reroll/route.ts",
      "app/api/quests/route.ts",
      "app/api/reader/cards/route.ts",
      "app/api/roleplay/_handlers.ts",
      "app/api/session/today/route.ts",
    ]);
  });

  it("is server-only", () => {
    expect(readFileSync(new URL("./service.ts", import.meta.url), "utf8")).toMatch(/^import "server-only";/);
  });
});
