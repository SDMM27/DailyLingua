// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { RetentionStats } from "@/lib/schemas/vocabulary";
import { RetentionCard } from "./retention-card";

afterEach(cleanup);

const none = { reviews: 0, recalled: 0 };

function stats(overrides: Partial<RetentionStats["byMode"]>, total: number): RetentionStats {
  return {
    total: { reviews: total, recalled: Math.round(total * 0.8) },
    byMode: { flip: none, translate: none, produce: none, listen: none, cloze: none, ...overrides },
  };
}

describe("RetentionCard", () => {
  it("shows the modes with enough reviews, flip as self-graded", () => {
    render(
      <RetentionCard
        stats={stats(
          { translate: { reviews: 34, recalled: 28 }, flip: { reviews: 12, recalled: 11 }, cloze: { reviews: 9, recalled: 9 } },
          55,
        )}
      />,
    );
    expect(screen.getByText(/82 % sur 34 révisions/)).toBeTruthy();
    expect(screen.getByText(/\(auto-évaluée\)/)).toBeTruthy();
    expect(screen.queryByText(/Phrase à trou/)).toBeNull();
    expect(screen.queryByText(/indicatifs/)).toBeNull();
  });

  it("says the figures are indicative below 30 reviews", () => {
    render(<RetentionCard stats={stats({ translate: { reviews: 12, recalled: 9 } }, 12)} />);
    expect(screen.getByText(/indicatifs/)).toBeTruthy();
  });

  it("explains when there is not enough data yet", () => {
    render(<RetentionCard stats={stats({}, 0)} />);
    expect(screen.getByText(/Pas encore assez/)).toBeTruthy();
  });
});
