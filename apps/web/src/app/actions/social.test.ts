import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
let pseudonymStatus = "ok";
let saved: unknown = null;

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("redirect"); } }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }),
}));
vi.mock("@dailylingua/data", () => ({
  setPseudonym: async (_: unknown, name: string) => (calls.push(`pseudonym:${name}`), pseudonymStatus),
  saveGameSettings: async (_: unknown, settings: unknown) => { saved = settings; },
  joinLeague: async () => (calls.push("join"), "ok"),
  leaveLeague: async () => { calls.push("leave"); },
  removeFriend: async () => true,
  createCoop: async () => "ok",
  joinCoop: async () => "ok",
  leaveCoop: async () => undefined,
  acceptInvite: async () => "invalid",
  createInvite: async () => ({ status: "ok", code: "ABCDEFGHJ" }),
}));

const actions = await import("./social");

beforeEach(() => {
  calls.length = 0;
  pseudonymStatus = "ok";
  saved = null;
});

describe("activateSocial", () => {
  it("refuses a pseudonym that does not fit before calling the database", async () => {
    for (const bad of ["ab", "name@mail.com", " ", "x".repeat(21), "-Tilleul"]) {
      expect(await actions.activateSocial({ pseudonym: bad, league: true, friends: true })).toEqual({ error: "invalid" });
    }
    expect(calls).toEqual([]);
  });

  it("accepts letters of any alphabet, digits, spaces and hyphens, and turns on only what was chosen", async () => {
    expect(await actions.activateSocial({ pseudonym: "Zoë 7-ñ", league: false, friends: true })).toEqual({ status: "ok" });
    expect(calls).toEqual(["pseudonym:Zoë 7-ñ"]);
    expect(saved).toEqual({ league: { enabled: false }, friends: { enabled: true } });
  });

  it("joins the league only when asked", async () => {
    await actions.activateSocial({ pseudonym: "Lune de mai", league: true, friends: false });
    expect(calls).toContain("join");
  });

  it("changes nothing else when the pseudonym is taken", async () => {
    pseudonymStatus = "taken";
    expect(await actions.activateSocial({ pseudonym: "Lune", league: true, friends: true })).toEqual({ status: "taken" });
    expect(saved).toBeNull();
  });
});

describe("switches", () => {
  it("turning the league off ends the membership; on joins it", async () => {
    await actions.setLeague(false);
    expect(saved).toEqual({ league: { enabled: false } });
    expect(calls).toEqual(["leave"]);
    calls.length = 0;
    expect(await actions.setLeague(true)).toEqual({ status: "ok" });
    expect(calls).toEqual(["join"]);
  });
});

describe("inputs", () => {
  it("validates ids, codes and the number of friends before calling the database", async () => {
    expect(await actions.joinCoopChallenge("nope")).toEqual({ error: "invalid" });
    expect(await actions.leaveCoopChallenge("nope")).toEqual({ error: "invalid" });
    expect(await actions.startCoop([])).toEqual({ error: "invalid" });
    expect(await actions.startCoop(["Aa1", "Bb2", "Cc3", "Dd4", "Ee5"])).toEqual({ error: "invalid" });
    expect(await actions.acceptInviteCode("x")).toEqual({ status: "invalid" });
    expect(await actions.removeFriendByPseudonym("<script>")).toEqual({ error: "invalid" });
  });
});
