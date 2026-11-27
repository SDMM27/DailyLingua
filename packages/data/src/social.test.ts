import { describe, expect, it } from "vitest";
import { acceptInvite, createInvite, getCoopOverview, getLeagueSummary, getSocialPseudonym, listFriends, setPseudonym } from "./social";
import { tableFake } from "./table-fake";

const rpc = (answers: Record<string, unknown>) => tableFake({}, { rpc: (name) => ({ data: answers[name] ?? null, error: null }) }).client;

describe("social reads", () => {
  it("maps the league summary and treats a missing one as not registered", async () => {
    expect(await getLeagueSummary(rpc({ league_week_summary: { registered: true, eligible: true, mode: "collective", participants: 3, total: 250, goal: 600, mine: 100, days_left: 4 } })))
      .toEqual({ registered: true, eligible: true, mode: "collective", participants: 3, total: 250, goal: 600, mine: 100, daysLeft: 4 });
    expect((await getLeagueSummary(rpc({ league_week_summary: { registered: false } }))).registered).toBe(false);
  });

  it("maps the friends list to the four listed fields", async () => {
    const friends = await listFriends(rpc({ friends_overview: [{ pseudonym: "Tilleul", language: "es", week_xp: 140, streak: null }] }));
    expect(friends).toEqual([{ pseudonym: "Tilleul", language: "es", weekXp: 140, streak: null }]);
  });

  it("maps the challenge, its members and the invitations", async () => {
    const overview = await getCoopOverview(rpc({ coop_overview: {
      enabled: true, invitations: [{ id: "c1", from: "Lune" }],
      challenge: { id: "c2", status: "active", week_start: "2026-11-23", days_left: 4, total: 284, goal: 480, reached: false,
        members: [{ pseudonym: "Lune", contribution: 120, me: true }, { pseudonym: "Tilleul", contribution: 164, me: false }] },
    } }));
    expect(overview.invitations).toEqual([{ id: "c1", from: "Lune" }]);
    expect(overview.challenge).toMatchObject({ id: "c2", status: "active", daysLeft: 4, total: 284, goal: 480, reached: false });
    expect(overview.challenge?.members).toEqual([{ pseudonym: "Lune", contribution: 120, me: true }, { pseudonym: "Tilleul", contribution: 164, me: false }]);
    expect((await getCoopOverview(rpc({ coop_overview: { enabled: false } }))).challenge).toBeNull();
  });

  it("reads only the learner's own pseudonym", async () => {
    const { client } = tableFake({ social_profile: [{ user_id: "u1", pseudonym: "Lune" }, { user_id: "u2", pseudonym: "Autre" }] });
    expect(await getSocialPseudonym(client, "u1")).toBe("Lune");
    expect(await getSocialPseudonym(client, "u3")).toBeNull();
  });
});

describe("social writes", () => {
  it("passes the status the database gave", async () => {
    expect(await setPseudonym(rpc({ social_set_pseudonym: "taken" }), "Lune")).toBe("taken");
    expect(await acceptInvite(rpc({ friend_invite_accept: "rate_limited" }), "ABC")).toBe("rate_limited");
    expect(await createInvite(rpc({ friend_invite_create: { status: "ok", code: "ABCDEFGHJ" } }))).toEqual({ status: "ok", code: "ABCDEFGHJ" });
    expect(await createInvite(rpc({ friend_invite_create: { status: "limit" } }))).toEqual({ status: "limit", code: undefined });
  });
});
