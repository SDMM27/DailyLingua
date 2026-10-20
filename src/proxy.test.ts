import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isPublic, proxy } from "./proxy";

const state = vi.hoisted(() => ({
  env: { NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon" } as unknown,
  claims: null as unknown,
}));

vi.mock("@/lib/supabase/env", () => ({ getSupabaseEnv: () => state.env }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getClaims: async () => ({ data: state.claims ? { claims: state.claims } : null }) } }),
}));

const visit = (path: string) => proxy(new NextRequest(`http://localhost:3000${path}`));
const location = (response: Response) => (response.headers.get("location") ? new URL(response.headers.get("location")!).pathname : null);

beforeEach(() => {
  state.env = { NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon" };
  state.claims = null;
});

describe("isPublic", () => {
  it.each(["/connexion", "/decouvrir", "/mot-de-passe-oublie", "/auth/confirm", "/installer", "/confidentialite", "/api/cron/missions", "/api/health"])(
    "%s is reachable without an account",
    (path) => expect(isPublic(path)).toBe(true),
  );

  it.each(["/", "/mission", "/creer-mon-compte", "/decouvrir-plus", "/preferences"])("%s needs a session", (path) =>
    expect(isPublic(path)).toBe(false),
  );
});

describe("proxy", () => {
  it("sends a signed-out visitor of the home page to the teaser", async () => {
    const response = await visit("/");
    expect(response.status).toBe(307);
    expect(location(response)).toBe("/decouvrir");
  });

  it("sends a signed-out visitor of any other protected page to the sign-in screen", async () => {
    expect(location(await visit("/mission"))).toBe("/connexion");
    expect(location(await visit("/creer-mon-compte"))).toBe("/connexion");
  });

  it("lets a signed-out visitor reach the public pages", async () => {
    for (const path of ["/decouvrir", "/connexion", "/confidentialite"]) {
      expect(location(await visit(path))).toBeNull();
    }
  });

  it("lets a signed-in visitor (guest or not) through", async () => {
    state.claims = { sub: "u1", is_anonymous: true };
    expect(location(await visit("/"))).toBeNull();
    expect(location(await visit("/mission"))).toBeNull();
  });

  it("is the public demo without Supabase configuration", async () => {
    state.env = null;
    expect(location(await visit("/"))).toBeNull();
    expect(location(await visit("/mission"))).toBeNull();
  });
});
