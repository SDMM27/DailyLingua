// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reduceListening, YouTubeListeningPlayer } from "./youtube-listening-player";

const VIDEO = { youtubeId: "dQw4w9WgXcQ", start: 30, end: 70, title: "Una domenica a Torino", channel: "Canale di prova" };

interface FakeOptions {
  videoId: string;
  host: string;
  playerVars: Record<string, number>;
  events: { onReady: () => void; onStateChange: (e: { data: number }) => void; onError: () => void };
}

class FakePlayer {
  static instances: FakePlayer[] = [];
  time = 0;
  loadVideoById = vi.fn();
  playVideo = vi.fn();
  pauseVideo = vi.fn();
  destroy = vi.fn();
  constructor(
    public element: HTMLElement,
    public options: FakeOptions,
  ) {
    FakePlayer.instances.push(this);
  }
  getCurrentTime() {
    return this.time;
  }
  ready() {
    act(() => this.options.events.onReady());
  }
  state(data: number) {
    act(() => this.options.events.onStateChange({ data }));
  }
}

const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;

type W = Window & { YT?: unknown; onYouTubeIframeAPIReady?: () => void };

beforeEach(() => {
  FakePlayer.instances = [];
  (window as W).YT = { Player: FakePlayer };
});
afterEach(() => {
  cleanup();
  delete (window as W).YT;
  document.head.querySelectorAll("script").forEach((s) => s.remove());
});

const button = () => screen.getByRole("button");
const player = () => FakePlayer.instances[FakePlayer.instances.length - 1];

function setup(props: Partial<Parameters<typeof YouTubeListeningPlayer>[0]> = {}) {
  const onPlaysChange = vi.fn();
  const user = userEvent.setup();
  render(<YouTubeListeningPlayer video={VIDEO} title="Regarde et écoute le passage" onPlaysChange={onPlaysChange} {...props} />);
  return { user, onPlaysChange };
}

/** Press the button and bring the player to the first PLAYING of the passage. */
async function startListening(user: ReturnType<typeof userEvent.setup>) {
  await user.click(button());
  await waitFor(() => expect(FakePlayer.instances.length).toBeGreaterThan(0));
  return player();
}

describe("reduceListening", () => {
  it("counts only the first playing of a listening that was asked for", () => {
    expect(reduceListening("starting", "playing")).toEqual({ session: "active", count: true, pause: false });
    expect(reduceListening("active", "playing")).toEqual({ session: "active", count: false, pause: false });
  });

  it("pauses a playing nobody asked for", () => {
    expect(reduceListening("idle", "playing")).toEqual({ session: "idle", count: false, pause: true });
  });

  it("ends the listening on the end of the passage or an error, without counting", () => {
    expect(reduceListening("active", "ended")).toEqual({ session: "idle", count: false, pause: false });
    expect(reduceListening("starting", "error")).toEqual({ session: "idle", count: false, pause: false });
  });

  it("ignores the end of the previous passage while a listening starts", () => {
    expect(reduceListening("starting", "ended")).toEqual({ session: "starting", count: false, pause: false });
  });
});

describe("YouTubeListeningPlayer", () => {
  it("is plain markup until the first press: no script, no player, no iframe", () => {
    setup();
    expect(button().textContent).toBe("Écouter");
    expect(button().className).toContain("min-h-11");
    expect(screen.getByRole("status").textContent).toBe("3 écoutes possibles");
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.head.querySelector("script")).toBeNull();
    expect(FakePlayer.instances).toHaveLength(0);
    expect(screen.getByText(/Extrait de « Una domenica a Torino », Canale di prova, sur YouTube/)).toBeTruthy();
    expect(screen.getByText("Une publicité peut s’afficher avant l’extrait : elle ne compte pas comme une écoute.")).toBeTruthy();
  });

  it("loads the official API on demand when it is not there yet", async () => {
    delete (window as W).YT;
    const { user } = setup();
    await user.click(button());
    const script = document.head.querySelector("script");
    expect(script?.getAttribute("src")).toBe("https://www.youtube.com/iframe_api");
    (window as W).YT = { Player: FakePlayer };
    act(() => (window as W).onYouTubeIframeAPIReady?.());
    await waitFor(() => expect(FakePlayer.instances).toHaveLength(1));
  });

  it("creates the privacy-enhanced player with no controls and no subtitles, then plays the passage", async () => {
    const { user } = setup();
    const p = await startListening(user);
    expect(p.options.host).toBe("https://www.youtube-nocookie.com");
    expect(p.options.videoId).toBe(VIDEO.youtubeId);
    expect(p.options.playerVars).toEqual({ controls: 0, disablekb: 1, cc_load_policy: 0, iv_load_policy: 3, fs: 0, rel: 0, playsinline: 1 });
    expect(p.options.playerVars).not.toHaveProperty("cc_lang_pref");
    p.ready();
    expect(p.loadVideoById).toHaveBeenCalledWith({ videoId: VIDEO.youtubeId, startSeconds: 30, endSeconds: 70 });
  });

  it("counts the listening at the first PLAYING, not at the press", async () => {
    const { user, onPlaysChange } = setup();
    const p = await startListening(user);
    p.ready();
    expect(onPlaysChange).not.toHaveBeenCalled();
    expect(button().textContent).toBe("Chargement…");
    p.time = 30;
    p.state(PLAYING);
    expect(onPlaysChange).toHaveBeenCalledWith(1);
    expect(button().textContent).toBe("Pause");
    expect(screen.getByRole("status").textContent).toBe("Écoute 1 sur 3");
  });

  it("does not count an advert playing before the passage", async () => {
    const { user, onPlaysChange } = setup();
    const p = await startListening(user);
    p.ready();
    p.time = 2;
    p.state(PLAYING);
    expect(onPlaysChange).not.toHaveBeenCalled();
    p.time = 30;
    p.state(PLAYING);
    expect(onPlaysChange).toHaveBeenCalledTimes(1);
  });

  it("does not count a pause nor a resume", async () => {
    const { user, onPlaysChange } = setup();
    const p = await startListening(user);
    p.ready();
    p.time = 30;
    p.state(PLAYING);
    await user.click(button());
    expect(p.pauseVideo).toHaveBeenCalledTimes(1);
    p.state(PAUSED);
    expect(button().textContent).toBe("Reprendre");
    await user.click(button());
    expect(p.playVideo).toHaveBeenCalledTimes(1);
    p.state(PLAYING);
    expect(button().textContent).toBe("Pause");
    expect(onPlaysChange).toHaveBeenCalledTimes(1);
  });

  it("counts three listenings, then is exhausted", async () => {
    const { user, onPlaysChange } = setup();
    const p = await startListening(user);
    p.ready();
    for (let n = 1; n <= 3; n++) {
      if (n > 1) {
        await user.click(button());
        expect(p.loadVideoById).toHaveBeenCalledTimes(n);
        // As the real player does: reloading the passage first reports the previous one as ended.
        p.state(ENDED);
        expect(button().textContent).toBe("Chargement…");
      }
      p.time = 30;
      p.state(PLAYING);
      expect(onPlaysChange).toHaveBeenLastCalledWith(n);
      p.state(ENDED);
      if (n < 3) expect(button().textContent).toBe("Réécouter");
    }
    expect(button().textContent).toBe("Tu as utilisé tes 3 écoutes");
    expect((button() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toBe("Écoute 3 sur 3");
  });

  it("starts with the listenings already used", () => {
    setup({ initialPlays: 3 });
    expect((button() as HTMLButtonElement).disabled).toBe(true);
    expect(FakePlayer.instances).toHaveLength(0);
  });

  it("pauses at once a video the learner started by touching it", async () => {
    const { user, onPlaysChange } = setup();
    const p = await startListening(user);
    p.ready();
    p.time = 30;
    p.state(PLAYING);
    p.state(ENDED);
    p.state(PLAYING);
    expect(p.pauseVideo).toHaveBeenCalledTimes(1);
    expect(onPlaysChange).toHaveBeenCalledTimes(1);
  });

  it("pauses a video running past the end of the passage", async () => {
    const { user } = setup();
    const p = await startListening(user);
    p.ready();
    p.time = 30;
    p.state(PLAYING);
    p.time = 72;
    await waitFor(() => expect(p.pauseVideo).toHaveBeenCalled(), { timeout: 2000 });
    await waitFor(() => expect(button().textContent).toBe("Réécouter"));
  });

  it("shows an error without consuming a listening when the player fails, then retries", async () => {
    const { user, onPlaysChange } = setup();
    const p = await startListening(user);
    p.ready();
    act(() => p.options.events.onError());
    expect(screen.getByRole("alert").textContent).toMatch(/pas pu être chargée/);
    expect(onPlaysChange).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("3 écoutes possibles");
    expect(button().textContent).toBe("Réessayer");
    await user.click(button());
    expect(p.loadVideoById).toHaveBeenCalledTimes(2);
  });

  it("shows an error when the API cannot be loaded", async () => {
    // A script that never defines YT: the load error handler fires.
    delete (window as W).YT;
    const { user } = setup();
    await user.click(button());
    const script = document.head.querySelector("script")!;
    act(() => script.dispatchEvent(new Event("error")));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  });

  it("destroys the player when unmounted", async () => {
    const { user } = setup();
    const p = await startListening(user);
    cleanup();
    expect(p.destroy).toHaveBeenCalledTimes(1);
  });
});
