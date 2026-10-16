// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMockMission } from "@/lib/data/mock/mission";
import { EMPTY_MISSION_PROGRESS } from "@/lib/schemas/mission";
import { MissionView } from "./mission-view";
import { NoAccessButton } from "./no-access-button";

const { reportNoAccess } = vi.hoisted(() => ({ reportNoAccess: vi.fn() }));
vi.mock("@/app/actions/mission", () => ({
  reportNoAccess,
  setActivityDone: vi.fn(),
  answerQuestion: vi.fn(),
  saveExpression: vi.fn(),
  saveProduction: vi.fn(),
  requestWritingFeedback: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const OPEN = { name: "Je n’ai pas accès à ce contenu" };

async function confirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", OPEN));
  await user.click(screen.getByRole("button", { name: "Remplacer" }));
}

describe("NoAccessButton", () => {
  it("asks for a confirmation before anything is sent, and can be cancelled", async () => {
    const user = userEvent.setup();
    render(<NoAccessButton sessionId="s1" />);
    await user.click(screen.getByRole("button", OPEN));
    expect(screen.getByText("Remplacer ce contenu ? Ta progression sur cette langue aujourd’hui sera effacée.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("button", OPEN)).toBeTruthy();
    expect(reportNoAccess).not.toHaveBeenCalled();
  });

  it("sends the session and shows the search while the server works", async () => {
    let finish!: (value: unknown) => void;
    reportNoAccess.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<NoAccessButton sessionId="s1" />);
    await confirm(user);
    expect(reportNoAccess).toHaveBeenCalledWith({ sessionId: "s1" });
    expect(screen.getByText("Recherche d’un autre contenu…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remplacer" })).toBeNull();

    finish({ ok: true, data: { status: "ready" } });
    // The page is refreshed by the action: the search stays displayed until the session is swapped.
    expect(await screen.findByText("Recherche d’un autre contenu…")).toBeTruthy();
  });

  it("says when no other content can be read", async () => {
    reportNoAccess.mockResolvedValue({ ok: true, data: { status: "no-content" } });
    const user = userEvent.setup();
    render(<NoAccessButton sessionId="s1" />);
    await confirm(user);
    expect(await screen.findByText("Aucun autre contenu lisible pour cette langue aujourd’hui.")).toBeTruthy();
  });

  it("says when the daily limit is reached", async () => {
    reportNoAccess.mockResolvedValue({ ok: true, data: { status: "limit" } });
    const user = userEvent.setup();
    render(<NoAccessButton sessionId="s1" />);
    await confirm(user);
    expect(await screen.findByText("Tu as déjà remplacé 3 contenus aujourd’hui.")).toBeTruthy();
  });

  it("shows the error of the action and offers the button again", async () => {
    reportNoAccess.mockResolvedValue({ ok: false, error: "Boom" });
    const user = userEvent.setup();
    render(<NoAccessButton sessionId="s1" />);
    await confirm(user);
    expect((await screen.findByRole("alert")).textContent).toBe("Boom");
    expect(screen.getByRole("button", OPEN)).toBeTruthy();
  });
});

describe("MissionView and NoAccessButton", () => {
  it("offers the button on each content, except in the demo", () => {
    const mission = buildMockMission("2026-10-13");
    const { rerender } = render(<MissionView mission={mission} progress={EMPTY_MISSION_PROGRESS} persist />);
    expect(screen.getAllByRole("button", OPEN)).toHaveLength(mission.sessions.length);
    rerender(<MissionView mission={mission} progress={EMPTY_MISSION_PROGRESS} persist={false} />);
    expect(screen.queryByRole("button", OPEN)).toBeNull();
  });
});
