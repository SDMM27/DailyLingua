// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AudioPlayer } from "./audio-player";

afterEach(cleanup);

const AUDIO_URL = "https://www.cdn.example.net/ep1.mp3?token=a";

describe("AudioPlayer", () => {
  it("renders no audio element before the tap, and names the host", () => {
    const { container } = render(<AudioPlayer audioUrl={AUDIO_URL} title="Episodio 1" />);
    expect(container.querySelector("audio")).toBeNull();
    expect(screen.getByRole("button", { name: "Écouter ici" })).toBeTruthy();
    expect(screen.getByText("Lu depuis cdn.example.net")).toBeTruthy();
  });

  it("loads a native audio player after the tap", async () => {
    const user = userEvent.setup();
    const { container } = render(<AudioPlayer audioUrl={AUDIO_URL} title="Episodio 1" />);
    await user.click(screen.getByRole("button", { name: "Écouter ici" }));
    const audio = container.querySelector("audio");
    expect(audio?.getAttribute("src")).toBe(AUDIO_URL);
    expect(audio?.hasAttribute("controls")).toBe(true);
    expect(audio?.getAttribute("preload")).toBe("metadata");
    expect(screen.queryByRole("button", { name: "Écouter ici" })).toBeNull();
  });

  it("changes the playback rate with the speed buttons", async () => {
    const user = userEvent.setup();
    const { container } = render(<AudioPlayer audioUrl={AUDIO_URL} title="Episodio 1" />);
    await user.click(screen.getByRole("button", { name: "Écouter ici" }));
    const audio = container.querySelector("audio")!;
    expect(screen.getByRole("button", { name: "1×" }).getAttribute("aria-pressed")).toBe("true");
    await user.click(screen.getByRole("button", { name: "0,75×" }));
    expect(audio.playbackRate).toBe(0.75);
    expect(screen.getByRole("button", { name: "0,75×" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "1×" }).getAttribute("aria-pressed")).toBe("false");
    await user.click(screen.getByRole("button", { name: "1,25×" }));
    expect(audio.playbackRate).toBe(1.25);
  });

  it("falls back to the publisher's page when the file cannot be played", async () => {
    const user = userEvent.setup();
    const { container } = render(<AudioPlayer audioUrl={AUDIO_URL} title="Episodio 1" />);
    await user.click(screen.getByRole("button", { name: "Écouter ici" }));
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.error(container.querySelector("audio")!);
    expect(screen.getByRole("alert").textContent).toBe("Lecture impossible ici : ouvre l’épisode chez l’éditeur.");
  });
});
