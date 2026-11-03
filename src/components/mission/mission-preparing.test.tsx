// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareTodayMission } from "@/app/actions/mission";
import { MissionPreparing } from "./mission-preparing";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/actions/mission", () => ({ prepareTodayMission: vi.fn() }));

const prepare = vi.mocked(prepareTodayMission);

beforeEach(() => {
  refresh.mockReset();
  prepare.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("MissionPreparing", () => {
  it("asks the server once, even in StrictMode, then refreshes the page", async () => {
    prepare.mockResolvedValue({ ok: true, data: { status: "ready" } });
    render(
      <StrictMode>
        <MissionPreparing />
      </StrictMode>,
    );
    expect(screen.getByRole("status").textContent).toContain("Préparation de ta mission…");
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(prepare).toHaveBeenCalledOnce();
    expect(prepare).toHaveBeenCalledWith({});
  });

  it("asks again while another request is writing the mission", async () => {
    vi.useFakeTimers();
    prepare
      .mockResolvedValueOnce({ ok: true, data: { status: "pending" } })
      .mockResolvedValueOnce({ ok: true, data: { status: "ready" } });
    render(<MissionPreparing />);
    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("offers to try again after a failure", async () => {
    const user = userEvent.setup();
    prepare
      .mockResolvedValueOnce({ ok: true, data: { status: "failed" } })
      .mockResolvedValueOnce({ ok: true, data: { status: "ready" } });
    render(<MissionPreparing />);
    await user.click(await screen.findByRole("button", { name: "Réessayer" }));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(prepare).toHaveBeenCalledTimes(2);
  });

  it("shows the server's message when the action is refused", async () => {
    prepare.mockResolvedValue({ ok: false, error: "Choisis d’abord tes langues." });
    render(<MissionPreparing />);
    expect(await screen.findByText("Choisis d’abord tes langues.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeTruthy();
  });

  it("points to the reading list when there is no content yet", async () => {
    prepare.mockResolvedValue({ ok: true, data: { status: "no-content" } });
    render(<MissionPreparing />);
    const link = await screen.findByRole("link", { name: "Voir les lectures" });
    expect(link.getAttribute("href")).toBe("/lire");
  });

  it("shows the rest day message with a link home when no language is worked today", async () => {
    prepare.mockResolvedValue({ ok: true, data: { status: "rest-day" } });
    render(<MissionPreparing />);
    expect(await screen.findByText(/c’est un jour de repos/)).toBeTruthy();
    expect(screen.getByText(/Les révisions restent disponibles/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Retour à l’accueil" }).getAttribute("href")).toBe("/");
    expect(prepare).toHaveBeenCalledTimes(1);
  });
});
