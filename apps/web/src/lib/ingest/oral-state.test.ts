import { getOralSentence, oralSentences } from "@dailylingua/content";
import { describe, expect, it } from "vitest";
import { USER, rows, uuid } from "@/test/ingest-rows";
import { buildIngestState } from "./build-state";
import { extractRefs, extractSentenceIds } from "./refs";

const SENTENCE = oralSentences("it")[0]!;
const RUSSIAN = oralSentences("ru")[0]!;

describe("oral sentences in the ingestion", () => {
  it("collects the ids of the sentences named by oral_attempt events, in the sentence id form only", () => {
    const event = (sentenceId: unknown, kind = "oral_attempt") => ({ clientEventId: uuid(1), kind, payload: { sentenceId } });
    expect(extractSentenceIds([event(SENTENCE.id), event(SENTENCE.id), event(RUSSIAN.id)])).toEqual([SENTENCE.id, RUSSIAN.id]);
    expect(extractSentenceIds([event("it-a1-01-saluer"), event("x#y"), event(`${SENTENCE.id}#more`), event(7), event(`it-a1-01-saluer#${"x".repeat(80)}`), event(null)])).toEqual([]);
    // Another kind of event never names a sentence, and hostile entries do not throw.
    expect(extractSentenceIds([event(SENTENCE.id, "unit_item_attempt"), null, 42, "x", { kind: "oral_attempt" }, { kind: "oral_attempt", payload: [] }])).toEqual([]);
    expect(extractRefs([event(SENTENCE.id)])).not.toHaveProperty("sentenceIds");
  });

  it("injects only the sentences the events name, as the content serves them; an unknown one is left out", () => {
    const { state } = buildIngestState({ userId: USER, memo: null, rows: rows(), sentenceIds: [SENTENCE.id, RUSSIAN.id, "it-a1-01-saluer#nope", "garbage"] });
    expect(Object.keys(state.oralSentences)).toEqual([SENTENCE.id, RUSSIAN.id]);
    expect(state.oralSentences[SENTENCE.id]).toEqual(getOralSentence(SENTENCE.id));
    expect(buildIngestState({ userId: USER, memo: null, rows: rows() }).state.oralSentences).toEqual({});
  });

  it("serves a draft sentence only when drafts are allowed", () => {
    const draft = oralSentences("it", { includeDrafts: true }).find((sentence) => !oralSentences("it").some((published) => published.id === sentence.id));
    if (!draft) return; // every unit of the content is published: nothing to hide
    expect(buildIngestState({ userId: USER, memo: null, rows: rows(), sentenceIds: [draft.id] }).state.oralSentences).toEqual({});
    expect(Object.keys(buildIngestState({ userId: USER, memo: null, rows: rows(), sentenceIds: [draft.id], allowDrafts: true }).state.oralSentences)).toEqual([draft.id]);
  });

  it("lists the active enrollments as the languages the learner studies", () => {
    const { state } = buildIngestState({ userId: USER, memo: null, rows: rows({ enrollments: [{ language: "it", dailyMinutes: 15 }, { language: "ru", dailyMinutes: 10 }] }) });
    expect(state.profile.enrolledLanguages).toEqual(["it", "ru"]);
  });
});
