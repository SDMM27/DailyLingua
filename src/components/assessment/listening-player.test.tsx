// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListeningPlayer } from "./listening-player";

const play = vi.spyOn(HTMLMediaElement.prototype, "play");
const pause = vi.spyOn(HTMLMediaElement.prototype, "pause");
vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});

beforeEach(() => {
  play.mockResolvedValue(undefined);
  pause.mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const audio = () => document.querySelector("audio")!;
const button = () => screen.getByRole("button");

function setup(props: Partial<Parameters<typeof ListeningPlayer>[0]> = {}) {
  const onPlaysChange = vi.fn();
  const user = userEvent.setup();
  render(<ListeningPlayer src="/assessment/it/it-a1-1.m4a" title="Écoute le passage" onPlaysChange={onPlaysChange} {...props} />);
  return { user, onPlaysChange };
}

describe("ListeningPlayer", () => {
  it("renders an audio element without controls, loaded on demand, and a big button", () => {
    setup();
    expect(audio().hasAttribute("controls")).toBe(false);
    expect(audio().getAttribute("preload")).toBe("none");
    expect(audio().getAttribute("src")).toBe("/assessment/it/it-a1-1.m4a");
    expect(button().textContent).toBe("Écouter");
    expect(button().className).toContain("min-h-11");
    expect(screen.getByRole("status").textContent).toBe("3 écoutes possibles");
    expect(play).not.toHaveBeenCalled();
  });

  it("counts a listening when it starts, and offers to pause", async () => {
    const { user, onPlaysChange } = setup();
    await user.click(button());
    expect(play).toHaveBeenCalledTimes(1);
    expect(onPlaysChange).toHaveBeenCalledWith(1);
    expect(button().textContent).toBe("Pause");
    expect(screen.getByRole("status").textContent).toBe("Écoute 1 sur 3");
  });

  it("does not count a pause nor a resume", async () => {
    const { user, onPlaysChange } = setup();
    await user.click(button());
    await user.click(button());
    expect(pause).toHaveBeenCalledTimes(1);
    fireEvent.pause(audio());
    expect(button().textContent).toBe("Reprendre");
    await user.click(button());
    expect(play).toHaveBeenCalledTimes(2);
    expect(onPlaysChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe("Écoute 1 sur 3");
  });

  it("counts a replay from the beginning, up to three, then disables the button", async () => {
    const { user, onPlaysChange } = setup();
    for (let n = 1; n <= 3; n++) {
      await user.click(button());
      expect(onPlaysChange).toHaveBeenLastCalledWith(n);
      fireEvent.ended(audio());
      if (n < 3) await waitFor(() => expect(button().textContent).toBe("Réécouter"));
    }
    await waitFor(() => expect(button().textContent).toBe("Tu as utilisé tes 3 écoutes"));
    expect((button() as HTMLButtonElement).disabled).toBe(true);
    expect(play).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("status").textContent).toBe("Écoute 3 sur 3");
  });

  it("starts with the listenings already used", async () => {
    const { user, onPlaysChange } = setup({ initialPlays: 2 });
    expect(screen.getByRole("status").textContent).toBe("Écoute 2 sur 3");
    expect(button().textContent).toBe("Réécouter");
    await user.click(button());
    expect(onPlaysChange).toHaveBeenCalledWith(3);
  });

  it("is disabled from the start when all listenings were used", () => {
    setup({ initialPlays: 3 });
    expect((button() as HTMLButtonElement).disabled).toBe(true);
    expect(button().textContent).toBe("Tu as utilisé tes 3 écoutes");
  });

  it("shows a clear error without consuming a listening when the audio cannot load, then retries", async () => {
    play.mockRejectedValueOnce(new DOMException("no source", "NotSupportedError"));
    const { user, onPlaysChange } = setup();
    await user.click(button());
    expect(screen.getByRole("alert").textContent).toMatch(/pas pu être chargé/);
    expect(onPlaysChange).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("3 écoutes possibles");
    expect(button().textContent).toBe("Réessayer");

    await user.click(button());
    expect(onPlaysChange).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the error on a media error event too", () => {
    setup();
    fireEvent.error(audio());
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("pauses the audio when it is unmounted", () => {
    setup();
    cleanup();
    expect(pause).toHaveBeenCalled();
  });
});
