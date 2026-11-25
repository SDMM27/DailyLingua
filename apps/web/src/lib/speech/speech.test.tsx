// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markSpeechPrivacySeen, speechPrivacySeen } from "./privacy";
import { createRecognizer, recognitionTag, speechRecognitionSupported } from "./recognizer";
import { useRecognition } from "./use-recognition";

/** A stand-in for the browser's `SpeechRecognition`: the test plays the part of the speech service. */
class FakeRecognition {
  static last: FakeRecognition | null = null;
  lang = "";
  interimResults = false;
  continuous = true;
  maxAlternatives = 0;
  started = 0;
  aborted = false;
  onresult: ((event: { results: unknown[] }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() {
    FakeRecognition.last = this;
  }
  start() { this.started += 1; }
  stop() { this.onend?.(); }
  abort() { this.aborted = true; }
  /** The service delivers the text understood so far (one result per phrase, as the real one does). */
  hear(...phrases: string[]) {
    this.onresult?.({ results: phrases.map((transcript) => Object.assign([{ transcript }], { isFinal: false })) });
  }
}

const scope = window as unknown as Record<string, unknown>;

function install(name: "SpeechRecognition" | "webkitSpeechRecognition" = "webkitSpeechRecognition") {
  scope[name] = FakeRecognition;
}

beforeEach(() => {
  FakeRecognition.last = null;
  // Node ships its own `localStorage` global, which hides the one of jsdom: a plain in-memory one is the same for the code.
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  });
});

afterEach(() => {
  delete scope.SpeechRecognition;
  delete scope.webkitSpeechRecognition;
  vi.unstubAllGlobals();
});

describe("createRecognizer", () => {
  it("is null without SpeechRecognition or webkitSpeechRecognition", () => {
    expect(speechRecognitionSupported()).toBe(false);
    expect(createRecognizer("it")).toBeNull();
  });

  it("listens in the BCP 47 tag of the language registry, one utterance with interim results", () => {
    install();
    expect(createRecognizer("it")).not.toBeNull();
    expect(FakeRecognition.last).toMatchObject({ lang: "it-IT", interimResults: true, continuous: false });
    createRecognizer("ru");
    expect(FakeRecognition.last?.lang).toBe("ru-RU");
    expect(recognitionTag("zz")).toBe("zz");
  });

  it("also finds the unprefixed constructor", () => {
    install("SpeechRecognition");
    expect(speechRecognitionSupported()).toBe(true);
  });

  it("delivers partial texts, then the whole text once at the end", () => {
    install();
    const recognizer = createRecognizer("it")!;
    const partial: string[] = [];
    const final: string[] = [];
    recognizer.onPartial = (text) => partial.push(text);
    recognizer.onFinal = (text) => final.push(text);
    recognizer.start();
    FakeRecognition.last!.hear("buon");
    FakeRecognition.last!.hear("buongiorno", "  come  va");
    FakeRecognition.last!.onend?.();
    expect(partial).toEqual(["buon", "buongiorno come va"]);
    expect(final).toEqual(["buongiorno come va"]);
  });

  it("reports no-speech when nothing was heard, and denied for a blocked microphone", () => {
    install();
    const recognizer = createRecognizer("it")!;
    const errors: string[] = [];
    recognizer.onError = (error) => errors.push(error);
    recognizer.start();
    FakeRecognition.last!.onend?.();
    recognizer.start();
    FakeRecognition.last!.onerror?.({ error: "not-allowed" });
    FakeRecognition.last!.onend?.();
    recognizer.start();
    FakeRecognition.last!.onerror?.({ error: "service-not-allowed" });
    recognizer.start();
    FakeRecognition.last!.onerror?.({ error: "network" });
    expect(errors).toEqual(["no-speech", "denied", "denied", "failed"]);
  });

  it("drops everything after abort", () => {
    install();
    const recognizer = createRecognizer("it")!;
    const calls: string[] = [];
    recognizer.onPartial = () => calls.push("partial");
    recognizer.onFinal = () => calls.push("final");
    recognizer.onError = () => calls.push("error");
    recognizer.start();
    recognizer.abort();
    FakeRecognition.last!.hear("ciao");
    FakeRecognition.last!.onerror?.({ error: "aborted" });
    FakeRecognition.last!.onend?.();
    expect(calls).toEqual([]);
    expect(FakeRecognition.last!.aborted).toBe(true);
  });
});

describe("useRecognition", () => {
  it("goes from idle to listening to done with the text heard", () => {
    install();
    const { result } = renderHook(() => useRecognition("it"));
    expect(result.current.status).toBe("idle");
    act(() => result.current.start());
    expect(result.current.status).toBe("listening");
    expect(FakeRecognition.last!.started).toBe(1);
    act(() => FakeRecognition.last!.hear("la porta"));
    expect(result.current).toMatchObject({ status: "listening", transcript: "la porta" });
    act(() => result.current.stop());
    expect(result.current).toMatchObject({ status: "done", transcript: "la porta", error: null });
    act(() => result.current.reset());
    expect(result.current).toMatchObject({ status: "idle", transcript: "" });
  });

  it("keeps the refusal of the microphone as an error the screen answers with the self-rating", () => {
    install();
    const { result } = renderHook(() => useRecognition("it"));
    act(() => result.current.start());
    act(() => FakeRecognition.last!.onerror?.({ error: "not-allowed" }));
    expect(result.current).toMatchObject({ status: "error", error: "denied" });
  });

  it("asks to try again when nothing was heard", () => {
    install();
    const { result } = renderHook(() => useRecognition("it"));
    act(() => result.current.start());
    act(() => result.current.stop());
    expect(result.current).toMatchObject({ status: "error", error: "no-speech" });
  });

  it("is unavailable without SpeechRecognition", () => {
    const { result } = renderHook(() => useRecognition("it"));
    expect(result.current.status).toBe("unavailable");
    act(() => result.current.start());
    expect(result.current.status).toBe("unavailable");
  });

  it("stops listening when the screen goes away", () => {
    install();
    const { result, unmount } = renderHook(() => useRecognition("it"));
    act(() => result.current.start());
    unmount();
    expect(FakeRecognition.last!.aborted).toBe(true);
  });
});

describe("the first-use privacy note", () => {
  it("is remembered on the device", () => {
    expect(speechPrivacySeen()).toBe(false);
    markSpeechPrivacySeen();
    expect(speechPrivacySeen()).toBe(true);
  });
});
