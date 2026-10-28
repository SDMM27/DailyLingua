import { describe, expect, it } from "vitest";
import { sourceDefinitionSchema } from "./content";

const base = {
  key: "test-source",
  name: "Test",
  language: "it",
  homepageUrl: "https://www.example.it/",
  feedUrl: "https://www.example.it/feed",
  contentType: "article",
  difficulty: "B2",
  defaultMinutes: 6,
  hosts: ["example.it"],
  license: {
    kind: "all-rights-reserved",
    name: "Tous droits réservés",
    termsUrl: "https://www.example.it/termini",
    commercialUse: false,
    verifiedOn: "2026-10-29",
    note: "test",
  },
};

describe("sourceDefinitionSchema defaultTopics", () => {
  it("is optional", () => {
    expect(sourceDefinitionSchema.parse(base).defaultTopics).toBeUndefined();
  });

  it("accepts one to three domains of the list", () => {
    expect(sourceDefinitionSchema.parse({ ...base, defaultTopics: ["sciences"] }).defaultTopics).toEqual(["sciences"]);
    expect(sourceDefinitionSchema.safeParse({ ...base, defaultTopics: ["culture", "histoire", "littérature"] }).success).toBe(true);
  });

  it("rejects an unknown domain, more than three, and an empty list", () => {
    expect(sourceDefinitionSchema.safeParse({ ...base, defaultTopics: ["cuisine"] }).success).toBe(false);
    expect(sourceDefinitionSchema.safeParse({ ...base, defaultTopics: ["culture", "histoire", "littérature", "sport"] }).success).toBe(false);
    expect(sourceDefinitionSchema.safeParse({ ...base, defaultTopics: [] }).success).toBe(false);
  });
});
