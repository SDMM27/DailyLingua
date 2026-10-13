import { describe, expect, it } from "vitest";
import { readSupabaseEnv } from "./env";

const URL = "http://127.0.0.1:54321";
const KEY = "sb_publishable_0123456789abcdefghij";

describe("readSupabaseEnv", () => {
  it("returns null when nothing is configured (demo mode)", () => {
    expect(readSupabaseEnv({})).toBeNull();
  });

  it("treats empty values as unset", () => {
    expect(
      readSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "  ",
        SUPABASE_SERVICE_ROLE_KEY: "",
      }),
    ).toBeNull();
  });

  it("accepts the public pair without the service role key", () => {
    expect(readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: KEY })).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: KEY,
    });
  });

  it("reads the service role key when present", () => {
    const env = readSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL: URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: KEY,
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_0123456789abcdefghijkl",
    });
    expect(env?.SUPABASE_SERVICE_ROLE_KEY).toBe("sb_secret_0123456789abcdefghijkl");
  });

  it("fails with a readable message when only part of the configuration is set", () => {
    expect(() => readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: URL })).toThrow(
      /Variables d'environnement Supabase invalides[\s\S]*NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });

  it("rejects a malformed URL", () => {
    expect(() =>
      readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "not a url", NEXT_PUBLIC_SUPABASE_ANON_KEY: KEY }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("rejects a service role key without the public variables", () => {
    expect(() => readSupabaseEnv({ SUPABASE_SERVICE_ROLE_KEY: "sb_secret_0123456789abcdefghijkl" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });
});
