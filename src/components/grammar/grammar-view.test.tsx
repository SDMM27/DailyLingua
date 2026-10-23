// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { GrammarSuggestion } from "@/lib/domain/grammar-suggestions";
import { FIXTURE_POINT } from "@/test/grammar-fixtures";
import { GrammarView } from "./grammar-view";

afterEach(cleanup);

const POINT = { ...FIXTURE_POINT, categories: ["agreement" as const, "verb" as const] };

function setup(suggestions: GrammarSuggestion[]) {
  render(
    <GrammarView
      userLanguages={["it"]}
      language="it"
      points={[POINT]}
      cards={[]}
      level="A1"
      today="2026-10-21"
      suggestions={suggestions}
    />,
  );
}

describe("GrammarView suggestions", () => {
  it("shows the suggested points with their reasons, before the reviews", () => {
    setup([
      {
        point: POINT,
        reasons: [
          { category: "agreement", count: 5 },
          { category: "verb", count: 3 },
        ],
      },
    ]);
    const section = within(screen.getByRole("region", { name: "Suggéré par tes erreurs" }));
    const link = section.getByRole("link", { name: /Le présent des verbes en -are/ });
    expect(link.getAttribute("href")).toBe(`/grammaire/it/${POINT.id}`);
    expect(section.getByText("Accords : 5 erreurs en 30 jours · Verbes : 3 erreurs en 30 jours")).toBeTruthy();
    const regions = screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"));
    expect(regions.indexOf("Suggéré par tes erreurs")).toBeLessThan(regions.indexOf("À revoir aujourd’hui"));
  });

  it("hides the section without suggestions", () => {
    setup([]);
    expect(screen.queryByText("Suggéré par tes erreurs")).toBeNull();
    expect(screen.getByRole("region", { name: "À revoir aujourd’hui" })).toBeTruthy();
  });
});
