// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MISSION_READY_MESSAGE } from "@/lib/schemas/mission-request";
import { dayLabel, NextTopicCardView, type NextTopicRow } from "./next-topic-card";

vi.mock("server-only", () => ({}));
const { setNextTopic } = vi.hoisted(() => ({ setNextTopic: vi.fn() }));
vi.mock("@/app/actions/next-topic", () => ({ setNextTopic }));
vi.mock("@/lib/data/repository", () => ({ getRepository: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const row = (overrides: Partial<NextTopicRow> = {}): NextTopicRow => ({
  language: "it",
  date: "2026-10-30",
  saved: null,
  available: ["sport", "culture"],
  ...overrides,
});

describe("dayLabel", () => {
  it("says demain for the next day, the weekday in full otherwise", () => {
    expect(dayLabel("2026-10-30", "2026-10-29")).toBe("demain");
    expect(dayLabel("2026-11-02", "2026-10-29")).toBe("lundi");
    expect(dayLabel("2026-10-31", "2026-10-29")).toBe("samedi");
  });
});

describe("NextTopicCardView", () => {
  it("defaults to « Au hasard de mes sujets » and disables the domains with few contents", () => {
    render(<NextTopicCardView rows={[row()]} today="2026-10-29" />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(within(select).getByRole("option", { name: "Au hasard de mes sujets" })).toBeTruthy();
    expect((within(select).getByRole("option", { name: "Sport" }) as HTMLOptionElement).disabled).toBe(false);
    const rare = within(select).getByRole("option", { name: "Cinéma (peu de contenus)" }) as HTMLOptionElement;
    expect(rare.disabled).toBe(true);
  });

  it("keeps the saved domain selectable and selected even when it became rare", () => {
    render(<NextTopicCardView rows={[row({ saved: "cinéma" })]} today="2026-10-29" />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("cinéma");
    expect((within(select).getByRole("option", { name: "Cinéma" }) as HTMLOptionElement).disabled).toBe(false);
  });

  it("shows no list for a language without any theme to choose", () => {
    render(<NextTopicCardView rows={[row({ available: [] })]} today="2026-10-29" />);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText(/Pas encore assez de contenus récents/)).toBeTruthy();
  });

  it("names the day: demain, or the weekday", () => {
    render(
      <NextTopicCardView rows={[row(), row({ language: "ru", date: "2026-11-02" })]} today="2026-10-29" />,
    );
    expect(screen.getByText("demain")).toBeTruthy();
    expect(screen.getByText("lundi")).toBeTruthy();
  });

  it("saves on change, with the language and the domain only", async () => {
    setNextTopic.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<NextTopicCardView rows={[row()]} today="2026-10-29" />);
    await user.selectOptions(screen.getByRole("combobox"), "sport");
    expect(setNextTopic).toHaveBeenCalledWith({ language: "it", topic: "sport" });
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("sport");
    await user.selectOptions(screen.getByRole("combobox"), "");
    expect(setNextTopic).toHaveBeenLastCalledWith({ language: "it", topic: null });
  });

  it("goes back to the previous value and shows the error when the server refuses", async () => {
    setNextTopic.mockResolvedValue({ ok: false, error: "Une erreur est survenue." });
    const user = userEvent.setup();
    render(<NextTopicCardView rows={[row({ saved: "culture" })]} today="2026-10-29" />);
    await user.selectOptions(screen.getByRole("combobox"), "sport");
    expect((await screen.findByRole("alert")).textContent).toBe("Une erreur est survenue.");
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("culture");
  });

  it("freezes the choice when the mission of that day is already written", async () => {
    setNextTopic.mockResolvedValue({ ok: false, error: MISSION_READY_MESSAGE });
    const user = userEvent.setup();
    render(<NextTopicCardView rows={[row({ saved: "culture" })]} today="2026-10-29" />);
    await user.selectOptions(screen.getByRole("combobox"), "sport");
    expect(await screen.findByText("Mission prête : Culture")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
