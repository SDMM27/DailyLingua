// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssessmentInviteCard } from "./assessment-invite-card";

const KEY = "dl-assessment-invite-first-it";

/** A Map-backed storage: the environment's own one is not reliable across Node versions. */
const store = new Map<string, string>();
const fakeStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
};

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", fakeStorage);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const card = (props: Partial<Parameters<typeof AssessmentInviteCard>[0]> = {}) => (
  <AssessmentInviteCard language="it" kind="first" today="2026-11-02" {...props} />
);

describe("AssessmentInviteCard", () => {
  it("draws nothing on the server, so hydration cannot mismatch", () => {
    expect(renderToString(card())).toBe("");
  });

  it("invites to the assessment of the language", () => {
    render(card());
    const link = screen.getByRole("link", { name: /Faire mon bilan complet/ });
    expect(link.getAttribute("href")).toBe("/niveau/it/bilan");
    expect(link.textContent).toContain("italien");
  });

  it("says `Refais ton bilan` for a redo", () => {
    render(card({ kind: "redo" }));
    expect(screen.getByRole("link", { name: /Refais ton bilan/ })).toBeTruthy();
  });

  it("is dismissed and remembers it", async () => {
    const user = userEvent.setup();
    render(card());
    await user.click(screen.getByRole("button", { name: "Masquer" }));
    expect(screen.queryByRole("link")).toBeNull();
    expect(JSON.parse(store.get(KEY)!)).toEqual({ on: "2026-11-02", count: 1 });
    cleanup();
    render(card());
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("comes back after 14 days, once, then never", async () => {
    const user = userEvent.setup();
    store.set(KEY, JSON.stringify({ on: "2026-10-20", count: 1 }));
    render(card());
    expect(screen.queryByRole("link")).toBeNull(); // 13 days
    cleanup();
    render(card({ today: "2026-11-03" }));
    await user.click(screen.getByRole("button", { name: "Masquer" }));
    expect(JSON.parse(store.get(KEY)!)).toEqual({ on: "2026-11-03", count: 2 });
    cleanup();
    render(card({ today: "2027-06-01" }));
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("ignores a garbled value", () => {
    store.set(KEY, "{nope");
    render(card());
    expect(screen.getByRole("link")).toBeTruthy();
  });

  it("works without storage: shown, and closable for the session", async () => {
    const denied = () => {
      throw new DOMException("denied", "SecurityError");
    };
    vi.stubGlobal("localStorage", { getItem: denied, setItem: denied });
    const user = userEvent.setup();
    render(card());
    expect(screen.getByRole("link")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Masquer" }));
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("keeps the dismissals of the first invitation apart from the redo one", () => {
    store.set(KEY, JSON.stringify({ on: "2026-11-02", count: 2 }));
    render(card({ kind: "redo" }));
    expect(screen.getByRole("link")).toBeTruthy();
  });
});
