import { ingestPayloadSchema } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { NOW, TODAY, emptyState, eventWriter, iso, uuid, words } from "./fixtures";
import { planIngest } from "./plan-ingest";
import type { IngestState, RawEvent, StateRoleplay } from "./types";

const GAME = uuid(700);
const OTHER = uuid(701);

function plan(state: IngestState, events: RawEvent[]) {
  const result = planIngest(state, events, NOW);
  expect(ingestPayloadSchema.safeParse(result.payload).success).toBe(true);
  return result;
}

const game = (extra: Partial<StateRoleplay> = {}): StateRoleplay => ({
  id: GAME, language: "it", level: "B1", status: "finished", paid: false, detectedLanguage: "it",
  learnerTurns: [words("a", 22), words("b", 22), words("c", 22)],
  ...extra,
});
const stateOf = (...games: StateRoleplay[]) => emptyState({ roleplays: Object.fromEntries(games.map((g) => [g.id, g])) });
const completed = (ev: ReturnType<typeof eventWriter>, roleplayId = GAME, time = "10:00:00") => ev("roleplay_completed", iso(time), { roleplayId });

describe("roleplay_completed", () => {
  it("pays roleplay.completed (15 XP, output) for a finished game with 3 turns, the words of its level and the target language", () => {
    const ev = eventWriter();
    const { payload, rejected, report } = plan(stateOf(game()), [completed(ev)]);
    expect(rejected).toEqual([]);
    expect(report.zeroed).toEqual([]);
    expect(payload.xp).toEqual([
      expect.objectContaining({
        reason: "roleplay.completed", amount: 15, language: "it", rule_version: "j5.2", source: null,
        meta: expect.objectContaining({ volet: "output", ref: GAME }),
      }),
    ]);
  });

  it.each<[string, Partial<StateRoleplay>, string]>([
    ["fewer than 3 learner turns", { learnerTurns: [words("a", 80), words("b", 80)] }, "too_short"],
    ["fewer words than the level asks (60 at B1)", { learnerTurns: [words("a", 20), words("b", 20), words("c", 19)] }, "too_short"],
    ["another language detected", { detectedLanguage: "fr" }, "wrong_language"],
    ["no language detected", { detectedLanguage: null }, "wrong_language"],
  ])("pays 0 with a reason for %s", (_label, extra, reason) => {
    const ev = eventWriter();
    const { payload, rejected, report } = plan(stateOf(game(extra)), [completed(ev)]);
    expect(rejected).toEqual([]);
    expect(payload.xp).toEqual([]);
    expect(report.zeroed).toEqual([{ clientEventId: expect.any(String), reason }]);
  });

  it("asks the words of the level of the game: 20 at A1", () => {
    const ev = eventWriter();
    const turns = [words("a", 7), words("b", 7), words("c", 6)];
    expect(plan(stateOf(game({ level: "A1", learnerTurns: turns })), [completed(ev)]).payload.xp).toHaveLength(1);
    expect(plan(stateOf(game({ level: "A2", learnerTurns: turns })), [completed(eventWriter(200))]).payload.xp).toEqual([]);
  });

  it("refuses a game that is unknown, of another account (absent from the state), or not finished", () => {
    const ev = eventWriter();
    for (const state of [emptyState(), stateOf(game({ id: OTHER })), stateOf(game({ status: "active" })), stateOf(game({ status: "abandoned" }))]) {
      const { payload, rejected } = plan(state, [completed(ev)]);
      expect(rejected).toEqual([{ clientEventId: expect.any(String), reason: "unknown_roleplay" }]);
      expect(payload.xp).toEqual([]);
    }
  });

  it("pays a game once: a game already paid, or the same game in two events, earns nothing more", () => {
    const ev = eventWriter();
    const paid = plan(stateOf(game({ paid: true })), [completed(ev)]);
    expect(paid.payload.xp).toEqual([]);
    expect(paid.report.zeroed).toEqual([{ clientEventId: expect.any(String), reason: "already_earned" }]);

    const twice = plan(stateOf(game()), [completed(ev, GAME, "10:00:00"), completed(ev, GAME, "10:05:00")]);
    expect(twice.payload.xp.map((line) => line.amount)).toEqual([15]);
  });

  it("pays one game a learning day: the second game of the day gets cap_reached", () => {
    const ev = eventWriter();
    const { payload, report } = plan(stateOf(game(), game({ id: OTHER })), [completed(ev, GAME, "10:00:00"), completed(ev, OTHER, "11:00:00")]);
    expect(payload.xp).toHaveLength(1);
    expect(report.zeroed).toEqual([{ clientEventId: expect.any(String), reason: "cap_reached" }]);
  });

  it("refuses an unknown field in the event, such as an xp or a score", () => {
    const ev = eventWriter();
    const { payload, rejected } = plan(stateOf(game()), [ev("roleplay_completed", iso("10:00:00"), { roleplayId: GAME, xp: 99 })]);
    expect(rejected).toEqual([{ clientEventId: expect.any(String), reason: "invalid_payload" }]);
    expect(payload.xp).toEqual([]);
  });

  it("uses the day of the event: TODAY is the ledger day", () => {
    const ev = eventWriter();
    const { payload } = plan(stateOf(game()), [completed(ev)]);
    expect(payload.xp[0]?.day).toBe(TODAY);
  });
});
