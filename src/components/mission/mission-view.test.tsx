// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { buildMockMission } from "@/lib/data/mock/mission";
import { MissionView } from "./mission-view";

afterEach(cleanup);

const progress = () => screen.getByRole("progressbar", { name: "Progression de la mission" });

describe("MissionView", () => {
  it("updates progress as activities are checked", async () => {
    const user = userEvent.setup();
    render(<MissionView mission={buildMockMission("2026-10-13")} />);
    expect(progress()).toHaveProperty("ariaValueNow", "0");

    await user.click(screen.getByRole("checkbox", { name: /Lire l'article/ }));
    // Reading is 8 of 30 minutes.
    expect(progress().getAttribute("aria-valuenow")).toBe("27");
    expect(screen.getByText("8 / 30 min")).toBeTruthy();

    for (const box of screen.getAllByRole("checkbox", { checked: false })) await user.click(box);
    expect(progress().getAttribute("aria-valuenow")).toBe("100");
    expect(screen.getByText("Mission accomplie")).toBeTruthy();
  });

  it("gives feedback and a score on the quiz", async () => {
    const user = userEvent.setup();
    render(<MissionView mission={buildMockMission("2026-10-13")} />);
    const groups = screen.getAllByRole("group");
    const quiz = groups.filter((g) => g.tagName === "FIELDSET");
    expect(quiz).toHaveLength(3);

    await user.click(within(quiz[0]).getAllByRole("button")[1]); // wrong
    expect(within(quiz[0]).getByText(/Pas tout à fait/)).toBeTruthy();
    // Options lock once answered.
    expect(within(quiz[0]).getAllByRole("button").every((b) => (b as HTMLButtonElement).disabled)).toBe(true);

    await user.click(within(quiz[1]).getAllByRole("button")[1]); // right
    expect(within(quiz[1]).getByText(/Exact/)).toBeTruthy();
    await user.click(within(quiz[2]).getAllByRole("button")[1]); // right
    expect(screen.getByText("Score : 2 / 3")).toBeTruthy();
  });

  it("shows the no-transcript fallback and no quiz for the podcast", () => {
    render(<MissionView mission={buildMockMission("2026-10-13")} />);
    const italian = screen.getByRole("region", { name: "Italien" });
    expect(within(italian).getByText(/Pas de transcription accessible/)).toBeTruthy();
    expect(within(italian).queryByText("Compréhension")).toBeNull();
  });

  it("counts words in the writing task, including Cyrillic", async () => {
    const user = userEvent.setup();
    render(<MissionView mission={buildMockMission("2026-10-13")} />);
    await user.type(screen.getByLabelText("Ton texte"), "Шум в моём городе мешает спать");
    expect(screen.getByText("6 mots")).toBeTruthy();
  });

  it("toggles saved expressions", async () => {
    const user = userEvent.setup();
    render(<MissionView mission={buildMockMission("2026-10-13")} />);
    await user.click(screen.getByRole("button", { name: "Ajouter « в разы » aux mots" }));
    expect(screen.getByRole("button", { name: "Retirer « в разы » des mots" })).toBeTruthy();
  });
});
