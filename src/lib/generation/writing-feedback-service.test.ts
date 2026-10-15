import { describe, expect, it, vi } from "vitest";
import type { WritingFeedback } from "@/lib/schemas/writing-feedback";
import { GenerationError } from "./errors";
import type { WritingReview, WritingReviewer } from "./writing-feedback";
import {
  requestWritingFeedback,
  type FeedbackSession,
  type WritingFeedbackStore,
} from "./writing-feedback-service";

const feedback: WritingFeedback = {
  scores: {
    grammar: { score: 4, comment: "c" },
    vocabulary: { score: 3, comment: "c" },
    register: { score: 4, comment: "c" },
    coherence: { score: 5, comment: "c" },
  },
  corrections: [],
  strength: "s",
};

const review: WritingReview = {
  feedback,
  model: "claude-haiku-5-5",
  promptVersion: "v",
  usage: { inputTokens: 1, outputTokens: 1 },
};

const TODAY = "2026-10-15";
const BODY = "Questo è il mio testo per la missione di oggi.";

function session(overrides: Partial<FeedbackSession> = {}): FeedbackSession {
  return {
    missionDate: TODAY,
    mode: "writing",
    attempts: 0,
    previous: null,
    request: { language: "it", level: "B1", targetLevel: "B2", purpose: "general", task: "t" },
    ...overrides,
  };
}

function setup(found: FeedbackSession | null = session(), reviewer?: Partial<WritingReviewer>) {
  let attempts = found?.attempts ?? 0;
  const store = {
    loadSession: vi.fn(async () => found),
    claimAttempt: vi.fn(async () => (attempts >= 3 ? null : ++attempts)),
    saveReview: vi.fn(async () => {}),
  } satisfies WritingFeedbackStore;
  const fullReviewer = { review: vi.fn(async () => review), ...reviewer };
  const log = vi.fn();
  const run = (body = BODY) =>
    requestWritingFeedback({ userId: "u", sessionId: "s", body, today: TODAY }, { store, reviewer: fullReviewer, log });
  return { store, reviewer: fullReviewer, log, run };
}

describe("requestWritingFeedback", () => {
  it("reviews the text with the session's level and purpose, then stores it", async () => {
    const { store, reviewer, run } = setup();
    expect(await run()).toEqual({ status: "ready", feedback, reviewedText: BODY, attemptsLeft: 2 });
    expect(reviewer.review).toHaveBeenCalledWith({ ...session().request, text: BODY });
    expect(store.saveReview).toHaveBeenCalledWith("u", "s", BODY, review);
  });

  it("returns the stored review of the same text without calling the model again", async () => {
    const { store, reviewer, run } = setup(session({ attempts: 1, previous: { feedback, body: BODY } }));
    expect(await run()).toEqual({ status: "ready", feedback, reviewedText: BODY, attemptsLeft: 2 });
    expect(store.claimAttempt).not.toHaveBeenCalled();
    expect(reviewer.review).not.toHaveBeenCalled();
  });

  it("reviews an edited text again while attempts are left", async () => {
    const { reviewer, run } = setup(session({ attempts: 1, previous: { feedback, body: "ancien texte, assez long" } }));
    expect(await run()).toMatchObject({ status: "ready", attemptsLeft: 1 });
    expect(reviewer.review).toHaveBeenCalledOnce();
  });

  it("stops at 3 attempts, failed ones included", async () => {
    const failing = { review: vi.fn(async () => Promise.reject(new GenerationError("timeout", "délai"))) };
    const { run } = setup(session(), failing);
    expect(await run("a1 — un texte assez long")).toEqual({ status: "unavailable", attemptsLeft: 2 });
    expect(await run("a2 — un texte assez long")).toEqual({ status: "unavailable", attemptsLeft: 1 });
    expect(await run("a3 — un texte assez long")).toEqual({ status: "unavailable", attemptsLeft: 0 });
    expect(await run("a4 — un texte assez long")).toEqual({ status: "limit" });
    expect(failing.review).toHaveBeenCalledTimes(3);
  });

  it("logs only the reason of a model failure", async () => {
    const { log, store, run } = setup(session(), {
      review: async () => Promise.reject(new Error("401 with headers x-api-key: sk-ant-secret")),
    });
    expect(await run()).toEqual({ status: "unavailable", attemptsLeft: 2 });
    expect(log.mock.calls.flat().join(" ")).not.toContain("sk-ant");
    expect(store.saveReview).not.toHaveBeenCalled();
  });

  it("still returns a review it could not save", async () => {
    const { store, log, run } = setup();
    store.saveReview.mockRejectedValueOnce(new Error("Supabase down"));
    expect(await run()).toMatchObject({ status: "ready", feedback });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("not saved"));
  });

  it.each([
    ["not-found", null],
    ["not-writing", session({ mode: "speaking" })],
    ["expired", session({ missionDate: "2026-10-13" })],
  ])("refuses %s sessions without spending an attempt", async (status, found) => {
    const { store, reviewer, run } = setup(found);
    expect(await run()).toEqual({ status });
    expect(store.claimAttempt).not.toHaveBeenCalled();
    expect(reviewer.review).not.toHaveBeenCalled();
  });

  it("accepts yesterday's mission (a text finished after midnight)", async () => {
    const { run } = setup(session({ missionDate: "2026-10-14" }));
    expect(await run()).toMatchObject({ status: "ready" });
  });
});
