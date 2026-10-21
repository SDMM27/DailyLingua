import { describe, expect, it } from "vitest";
import type { CandidateContent, GenerationRequest, SessionRequest } from "@/lib/schemas/generation";
import { LANGUAGE_PURPOSES } from "@/lib/schemas/preferences";
import { PURPOSE_REGISTERS, SYSTEM_PROMPT, buildUserMessage } from "./prompt";

const candidate: CandidateContent = {
  id: "c0",
  type: "article",
  title: "Titre",
  summary: "Résumé",
  sourceName: "Source",
  difficulty: "B1",
  durationMinutes: 5,
  categories: [],
  publishedAt: null,
};

const session = (language: SessionRequest["language"], purpose: SessionRequest["purpose"]): SessionRequest => ({
  language,
  level: "B1",
  targetLevel: "B2",
  focus: "",
  purpose,
  topics: [],
  minutes: 15,
  productionMode: "writing",
  productionMinutes: 5,
  candidates: [candidate],
});

describe("SYSTEM_PROMPT", () => {
  it.each(LANGUAGE_PURPOSES)("describes the %s purpose", (purpose) => {
    expect(SYSTEM_PROMPT).toContain(`\n- ${purpose}: `);
  });
});

describe("production modes", () => {
  it("describes the spoken mode without mentioning a recording", () => {
    expect(SYSTEM_PROMPT).toContain('"spoken"');
    expect(SYSTEM_PROMPT).toMatch(/hints_fr never mention recording or listening back/);
    expect(SYSTEM_PROMPT).not.toContain("speaking task");
  });

  it("gives the expected length of a spoken task as a word range", () => {
    const spoken = { ...session("it", "general"), productionMode: "spoken", productionMinutes: 8 } as const;
    const message = buildUserMessage({ date: "2026-10-15", sessions: [spoken] });
    expect(message).toContain("production: spoken, expected length: 30–50 mots");
  });
});

describe("buildUserMessage", () => {
  it("gives each language the register of its own purpose", () => {
    const request: GenerationRequest = {
      date: "2026-10-15",
      sessions: [session("en", "professional"), session("es", "conversational")],
    };
    const blocks = buildUserMessage(request).split("## Language").slice(1);
    const en = blocks.find((b) => b.startsWith(' "en"'))!;
    const es = blocks.find((b) => b.startsWith(' "es"'))!;
    expect(en).toContain(`professional (${PURPOSE_REGISTERS.professional})`);
    expect(en).not.toContain(PURPOSE_REGISTERS.conversational);
    expect(es).toContain(`conversational (${PURPOSE_REGISTERS.conversational})`);
    expect(es).not.toContain(PURPOSE_REGISTERS.professional);
  });

  it("lists the interests of each session, never those of another language", () => {
    const request: GenerationRequest = {
      date: "2026-10-16",
      sessions: [
        { ...session("en", "professional"), topics: ["économie", "technologie"] },
        { ...session("es", "conversational"), topics: ["cinéma"] },
      ],
    };
    const message = buildUserMessage(request);
    expect(message).not.toContain("Learner's interests");
    const blocks = message.split("## Language").slice(1);
    const en = blocks.find((b) => b.startsWith(' "en"'))!;
    const es = blocks.find((b) => b.startsWith(' "es"'))!;
    expect(en).toContain("interests for this language (French labels): économie, technologie");
    expect(en).not.toContain("cinéma");
    expect(es).toContain("interests for this language (French labels): cinéma");
    expect(es).not.toContain("économie");
  });

  it("says when a session has no particular interest", () => {
    const message = buildUserMessage({ date: "2026-10-16", sessions: [session("en", "general")] });
    expect(message).toContain("interests for this language (French labels): aucun en particulier");
  });
});
