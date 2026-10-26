// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DayCell } from "@/lib/domain/stats";
import { WeekCard } from "./week-card";

afterEach(cleanup);

const days: DayCell[] = ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26"].map(
  (date, i) => ({ date, studied: i % 2 === 0, isToday: i === 6 }),
);
const stats = { streak: 4, daysStudied: 12, wordsKnown: 30, weekMinutes: 95 };

describe("WeekCard", () => {
  it("shows the streak by default", () => {
    render(<WeekCard days={days} stats={stats} />);
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("jours d’affilée")).toBeTruthy();
  });

  it("hides the streak but keeps the week dots and the stats", () => {
    render(<WeekCard days={days} stats={stats} showStreak={false} />);
    expect(screen.queryByText("jours d’affilée")).toBeNull();
    expect(screen.queryByText("4")).toBeNull();
    expect(screen.getByLabelText("Sept derniers jours").querySelectorAll("li")).toHaveLength(7);
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("mots maîtrisés")).toBeTruthy();
    expect(screen.getByText("min cette semaine")).toBeTruthy();
  });
});
