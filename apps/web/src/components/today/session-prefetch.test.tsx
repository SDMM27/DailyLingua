// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { learningDay } from "@dailylingua/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const put = vi.fn<(packet: unknown) => Promise<void>>(async () => undefined);
const purge = vi.fn<(today: string, queueEmpty: boolean) => Promise<number>>(async () => 0);
const get = vi.fn<(language: string, day: string) => Promise<unknown>>(async () => null);
const queueSize = vi.fn(async () => 0);
let sync: { userId: string; queueSize: () => Promise<number> } | null = { userId: "user-1", queueSize };
vi.mock("@/components/pwa/event-sync-provider", () => ({ useEventSync: () => sync }));
vi.mock("@/lib/offline/session-packet-store", () => ({
  createUserPacketStore: vi.fn(() => ({ put, purge, get })),
  indexedDbPacketsAvailable: () => true,
}));

const { SessionPrefetch } = await import("./session-prefetch");
const { createUserPacketStore } = await import("@/lib/offline/session-packet-store");

const packet = {
  session: { id: "00000000-0000-4000-8000-000000000001", language: "it", day: "2026-11-18", format: 15, kind: "daily", status: "planned", servedAt: "2026-11-18T07:00:00.000Z" },
  steps: [{ step: "wake", minutes: 3, required: true }],
  text: null,
  items: [],
  cards: [],
  errorOfTheDay: null,
  quotas: { writingFeedback: { used: 0, limit: 3 }, rewriteCheck: { used: 0, limit: 6 } },
  serverDay: "2026-11-18",
  timeZone: "Europe/Paris",
};

const setOnline = (online: boolean) => Object.defineProperty(navigator, "onLine", { value: online, configurable: true });
const answer = (status: number, body: unknown) => vi.fn<(url: string) => Promise<Response>>(async () => new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.clearAllMocks();
  sync = { userId: "user-1", queueSize };
  setOnline(true);
});
afterEach(() => vi.unstubAllGlobals());

describe("SessionPrefetch", () => {
  it("renders nothing", () => {
    vi.stubGlobal("fetch", answer(200, packet));
    expect(render(<SessionPrefetch language="it" />).container.innerHTML).toBe("");
  });

  it("fetches the packet of the language, keeps it in the store of the user and purges", async () => {
    const fetcher = answer(200, packet);
    vi.stubGlobal("fetch", fetcher);
    render(<SessionPrefetch language="it" />);
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/session/today?language=it");
    expect(createUserPacketStore).toHaveBeenCalledWith("user-1");
    expect((put.mock.calls[0]?.[0] as { session: { id: string } }).session.id).toBe(packet.session.id);
    await waitFor(() => expect(purge).toHaveBeenCalledWith("2026-11-18", true));
  });

  it("does not purge completed sessions while events are still waiting", async () => {
    queueSize.mockResolvedValueOnce(3);
    vi.stubGlobal("fetch", answer(200, packet));
    render(<SessionPrefetch language="it" />);
    await waitFor(() => expect(purge).toHaveBeenCalledWith("2026-11-18", false));
  });

  it("does nothing offline or without a user", () => {
    const fetcher = answer(200, packet);
    vi.stubGlobal("fetch", fetcher);
    setOnline(false);
    render(<SessionPrefetch language="it" />).unmount();
    setOnline(true);
    sync = null;
    render(<SessionPrefetch language="it" />).unmount();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("restores the current user's packet for the current learning day when offline", async () => {
    setOnline(false);
    const date = learningDay(new Date(), packet.timeZone);
    const cached = { ...packet, session: { ...packet.session, day: date }, serverDay: date };
    get.mockResolvedValueOnce(cached);
    const onPacket = vi.fn();
    render(<SessionPrefetch language="it" timeZone={packet.timeZone} onPacket={onPacket} />);
    await waitFor(() => expect(onPacket).toHaveBeenCalledWith(cached, true));
    expect(get).toHaveBeenCalledWith("it", date);
  });

  it("stores nothing on an error status or on an answer that is not a packet", async () => {
    for (const bad of [answer(401, { error: "unauthenticated" }), answer(503, {}), answer(200, { nope: true })]) {
      vi.stubGlobal("fetch", bad);
      render(<SessionPrefetch language="it" />).unmount();
      await waitFor(() => expect(bad).toHaveBeenCalled());
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(put).not.toHaveBeenCalled();
  });

  it("swallows a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    render(<SessionPrefetch language="it" />);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(put).not.toHaveBeenCalled();
  });
});
