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

describe("buildUserMessage", () => {
  it("gives each language the register of its own purpose", () => {
    const request: GenerationRequest = {
      date: "2026-10-15",
      topics: [],
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
});
