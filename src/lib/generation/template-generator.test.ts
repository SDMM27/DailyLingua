import { describe, expect, it } from "vitest";
import { LANGUAGE_CODES } from "@/lib/domain/languages";
import type { GenerationRequest } from "@/lib/schemas/generation";
import { createTemplateGenerator } from "./template-generator";
import { validateGeneratedMission } from "./validate";

function request(): GenerationRequest {
  return {
    date: "2026-10-13",
    topics: [],
    sessions: LANGUAGE_CODES.map((language, i) => ({
      language,
      level: "B1",
      targetLevel: "B2",
      focus: "",
      purpose: "general",
      minutes: 10,
      productionMode: i % 2 === 0 ? "writing" : "speaking",
      productionMinutes: 4,
      candidates: [
        {
          id: `c-${language}`,
          type: "article",
          title: "Un titre",
          summary: "Un résumé",
          sourceName: "Source",
          difficulty: "B1",
          durationMinutes: 5,
          categories: [],
          publishedAt: null,
        },
      ],
    })),
  };
}

describe("createTemplateGenerator", () => {
  const generator = createTemplateGenerator();

  it("produces a valid session for every language", async () => {
    const req = request();
    const result = await generator.generate(req);
    expect(generator.name).toBe("template");
    expect(result).toMatchObject({ source: "template", model: "template", promptVersion: null, usage: null });
    const sessions = validateGeneratedMission(result, req);
    expect(sessions).toHaveLength(LANGUAGE_CODES.length);
    for (const [i, session] of sessions.entries()) {
      expect(session.content.id).toBe(`c-${LANGUAGE_CODES[i]}`);
      expect(session.questions).toEqual([]);
      expect(session.expressions).toEqual([]);
      expect(session.production.hints.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("names the language in French and adapts to the mode", async () => {
    const result = await generator.generate(request());
    const [ru, it_] = result.sessions;
    expect(ru.production.prompt).toContain("En russe");
    expect(ru.production.prompt).toContain("résume");
    expect(it_.production.prompt).toContain("« Un titre »");
    expect(it_.production.prompt).toContain("à voix haute");
  });
});
