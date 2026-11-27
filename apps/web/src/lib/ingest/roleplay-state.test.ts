import { describe, expect, it } from "vitest";
import { USER, rows, uuid } from "@/test/ingest-rows";
import { buildIngestState } from "./build-state";
import { extractRefs } from "./refs";

const GAME = uuid(700);

describe("role plays in the ingestion", () => {
  it("collects the ids named by roleplay_completed events, in UUID form only, and by no other kind", () => {
    const event = (roleplayId: unknown, kind = "roleplay_completed") => ({ clientEventId: uuid(1), kind, payload: { roleplayId } });
    expect(extractRefs([event(GAME), event(GAME)]).roleplayIds).toEqual([GAME]);
    expect(extractRefs([event("not-a-uuid"), event(7), event(null), event(GAME, "oral_attempt")])).not.toHaveProperty("roleplayIds");
  });

  it("injects the learner's own games as the rows give them, and none by default", () => {
    const game = { id: GAME, language: "it", level: "B1", status: "finished" as const, learnerTurns: ["Ciao"], detectedLanguage: "it", paid: false };
    expect(buildIngestState({ userId: USER, memo: null, rows: rows({ roleplays: [game] }) }).state.roleplays).toEqual({ [GAME]: game });
    expect(buildIngestState({ userId: USER, memo: null, rows: rows() }).state.roleplays).toEqual({});
  });
});
