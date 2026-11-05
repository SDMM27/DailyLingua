// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { GrammarPoint } from "@/lib/schemas/grammar";
import { FIXTURE_POINT } from "@/test/grammar-fixtures";
import { GrammarPointView } from "./grammar-point-view";

afterEach(cleanup);

function setup(point: GrammarPoint) {
  render(<GrammarPointView point={point} language="it" today="2026-11-05" persist={false} />);
}

describe("GrammarPointView review notice", () => {
  it("tells that a point reviewed by AI has no native review yet, with a link to report an error", () => {
    setup({ ...FIXTURE_POINT, reviewedOn: null, aiReview: { on: "2026-11-05", model: "claude-opus-4-8", rubric: "v1" } });
    expect(screen.getByText(/Relu par IA, pas encore par un natif\./)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Signaler une erreur" }).getAttribute("href")).toBe(
      `/retour?depuis=/grammaire/it/${FIXTURE_POINT.id}`,
    );
    expect(screen.queryByText("Non relue")).toBeNull();
  });

  it("shows only the draft badge for a draft", () => {
    setup({ ...FIXTURE_POINT, reviewedOn: null });
    expect(screen.getByText("Non relue")).toBeTruthy();
    expect(screen.queryByText(/Relu par IA/)).toBeNull();
  });

  it("shows nothing for a point reviewed by a native speaker", () => {
    setup({ ...FIXTURE_POINT, reviewedOn: "2026-10-01" });
    expect(screen.queryByText(/Relu par IA/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Signaler une erreur" })).toBeNull();
    expect(screen.queryByText("Non relue")).toBeNull();
  });
});
