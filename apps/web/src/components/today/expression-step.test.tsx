// @vitest-environment jsdom
import { loadMessages } from "@dailylingua/i18n";
import { MAX_PRODUCTION_CHARS, MAX_REWRITE_CHARS, type SessionPacket } from "@dailylingua/schemas";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { act, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventSyncApi } from "@/components/pwa/event-sync-provider";
import { ExpressionStep, type AnswerMode, type Production } from "./expression-step";
import { RewriteTask } from "./rewrite-task";

const messages = await loadMessages("fr");
const text = { language: "it", levelBand: "A1", writingTask: "Descrivi il tuo bar preferito." } as NonNullable<SessionPacket["text"]>;
// 24 words: above the 20 an A1 production asks for.
const spoken = "il mio bar preferito è vicino alla stazione di solito prendo un cappuccino e un cornetto la barista si chiama Giulia ed è molto simpatica";

/** A stand-in for the browser SpeechRecognition; the test plays the part of the speech service. */
class FakeRecognition {
  static all: FakeRecognition[] = [];
  static failToStart = false;
  lang = "";
  interimResults = false;
  continuous = false;
  maxAlternatives = 0;
  started = 0;
  stopped = 0;
  onresult: ((event: { results: unknown[] }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() { FakeRecognition.all.push(this); }
  start() {
    if (FakeRecognition.failToStart) throw new Error("Speech service failed to start");
    this.started += 1;
  }
  stop() {
    this.stopped += 1;
    this.onend?.();
  }
  abort() { /* Nothing is delivered. */ }
  hear(phrase: string) {
    this.onresult?.({ results: [Object.assign([{ transcript: phrase }], { isFinal: false })] });
  }
}
const last = () => FakeRecognition.all.at(-1)!;
const scope = window as unknown as Record<string, unknown>;

function Harness({ suggestSpoken, onSubmit, initialMode = null, paused = false }: {
  suggestSpoken: boolean; onSubmit(production: Production): void; initialMode?: AnswerMode | null; paused?: boolean;
}) {
  const [mode, setMode] = useState<AnswerMode | null>(initialMode);
  return (
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ExpressionStep text={text} saving={false} paused={paused} mode={mode} suggestSpoken={suggestSpoken} quota={{ used: 1, limit: 3 }} onMode={setMode} onSubmit={onSubmit} />
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  FakeRecognition.all = [];
  FakeRecognition.failToStart = false;
  scope.webkitSpeechRecognition = FakeRecognition;
  // Node ships its own localStorage global, which hides the one of jsdom: a plain one is the same for the code.
  const store = new Map<string, string>([["dailylingua-speech-privacy", "1"]]);
  vi.stubGlobal("localStorage", { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) });
});

afterEach(() => {
  delete scope.webkitSpeechRecognition;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("ExpressionStep", () => {
  it("starts on Write, and on Say when the packet suggests it", () => {
    const { unmount } = render(<Harness suggestSpoken={false} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Écrire" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("textbox")).toBeTruthy();
    unmount();
    render(<Harness suggestSpoken onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Dire" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("keeps the choice of the learner over the suggestion", () => {
    render(<Harness suggestSpoken initialMode="write" onSubmit={vi.fn()} />);
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("offers no switch and only the field where the browser cannot recognise speech", () => {
    delete scope.webkitSpeechRecognition;
    render(<Harness suggestSpoken onSubmit={vi.fn()} />);
    expect(screen.queryByRole("group", { name: "Mode de réponse" })).toBeNull();
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("listens continuously in the language, shows the transcript live, then sends it as a spoken production", async () => {
    const onSubmit = vi.fn();
    render(<Harness suggestSpoken onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Commencer à parler" }));
    expect(last()).toMatchObject({ lang: "it-IT", continuous: true, interimResults: true, started: 1 });
    act(() => last().hear(spoken));
    expect(screen.getByText("Ce que ton téléphone comprend")).toBeTruthy();
    expect(screen.getByText(spoken)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Arrêter" }));

    expect(screen.getByText(/Ce que ton téléphone a compris · 0:0[0-9]/)).toBeTruthy();
    expect(screen.getByText(/peut corriger certaines fautes sans le dire/)).toBeTruthy();
    expect(screen.getByText(/2 corrections restantes/)).toBeTruthy();
    // The transcript is read only in this mode.
    expect(screen.queryByRole("textbox")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Envoyer pour correction" }));
    expect(onSubmit).toHaveBeenCalledWith({ text: spoken, composeMs: expect.any(Number), speakingMs: expect.any(Number) });
  });

  it("adds to the text when the learner resumes, and drops everything on Start over", async () => {
    render(<Harness suggestSpoken onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Commencer à parler" }));
    act(() => last().hear("prima frase"));
    await userEvent.click(screen.getByRole("button", { name: "Arrêter" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuer à parler" }));
    expect(FakeRecognition.all).toHaveLength(2);
    act(() => last().hear("seconda frase"));
    expect(screen.getByText("prima frase seconda frase")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Arrêter" }));
    expect(screen.getByText("prima frase seconda frase")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Recommencer" }));
    expect(screen.queryByText("prima frase seconda frase")).toBeNull();
    expect(screen.getByRole("button", { name: "Commencer à parler" })).toBeTruthy();
  });

  it("carries the transcript into the field on Write, and the production is then a written one", async () => {
    const onSubmit = vi.fn();
    render(<Harness suggestSpoken onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Commencer à parler" }));
    act(() => last().hear(spoken));
    // Switching while the device still listens loses nothing.
    await userEvent.click(screen.getByRole("button", { name: "Écrire" }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(spoken);
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer mon texte" }));
    expect(onSubmit).toHaveBeenCalledWith({ text: spoken, composeMs: expect.any(Number) });
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty("speakingMs");
  });

  it("stops by itself after two minutes of speaking", () => {
    vi.useFakeTimers();
    render(<Harness suggestSpoken onSubmit={vi.fn()} />);
    act(() => { screen.getByRole("button", { name: "Commencer à parler" }).click(); });
    act(() => last().hear(spoken));
    act(() => { vi.advanceTimersByTime(121_000); });
    expect(screen.getByText(/Deux minutes/)).toBeTruthy();
    expect(screen.getByText(/Ce que ton téléphone a compris · 2:00/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Continuer à parler" })).toBeNull();
  });

  it("stops the microphone on pause and shows the transcript on return", async () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<Harness suggestSpoken onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Commencer à parler" }));
    act(() => last().hear(spoken));
    rerender(<Harness suggestSpoken onSubmit={onSubmit} paused />);
    expect(last().stopped).toBe(1);
    rerender(<Harness suggestSpoken onSubmit={onSubmit} />);
    expect(screen.getByText(spoken)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Arrêter" })).toBeNull();
    expect(screen.getByRole("button", { name: "Continuer à parler" })).toBeTruthy();
  });

  it("lets a long transcript be shortened in Write before it can be sent", async () => {
    const transcript = spoken.repeat(Math.ceil(MAX_PRODUCTION_CHARS / spoken.length) + 1);
    const onSubmit = vi.fn();
    render(<Harness suggestSpoken onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Commencer à parler" }));
    act(() => last().hear(transcript));
    await userEvent.click(screen.getByRole("button", { name: "Arrêter" }));
    expect((screen.getByRole("button", { name: "Envoyer pour correction" }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Écrire" }));
    const field = screen.getByRole<HTMLTextAreaElement>("textbox");
    expect(field.value).toBe(transcript);
    const submit = screen.getByRole<HTMLButtonElement>("button", { name: "Enregistrer mon texte" });
    expect(submit.disabled).toBe(true);
    fireEvent.submit(field.form!);
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: spoken } });
    await userEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({ text: spoken, composeMs: expect.any(Number) });
  });

  it("leaves no running clock when the speech service throws on start", () => {
    vi.useFakeTimers();
    FakeRecognition.failToStart = true;
    render(<Harness suggestSpoken onSubmit={vi.fn()} />);
    const count = vi.getTimerCount();
    act(() => { screen.getByRole("button", { name: "Commencer à parler" }).click(); });
    expect(vi.getTimerCount()).toBe(count);
    expect(screen.getByRole("button", { name: "Commencer à parler" })).toBeTruthy();
  });

  it("allows a fresh two minutes after a timeout without a transcript", () => {
    vi.useFakeTimers();
    render(<Harness suggestSpoken onSubmit={vi.fn()} />);
    act(() => { screen.getByRole("button", { name: "Commencer à parler" }).click(); });
    act(() => { vi.advanceTimersByTime(120_000); });
    expect(last().stopped).toBe(1);
    act(() => { screen.getByRole("button", { name: "Commencer à parler" }).click(); });
    expect(FakeRecognition.all).toHaveLength(2);
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(last()).toMatchObject({ started: 1, stopped: 0 });
  });

  it("says the microphone is refused and leaves the way to Write open", async () => {
    render(<Harness suggestSpoken onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Commencer à parler" }));
    act(() => last().onerror?.({ error: "not-allowed" }));
    expect(screen.getByText(/Le micro n.est pas autorisé/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Écrire" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("RewriteTask", () => {
  it("keeps the dictated draft on pause and accepts it only after shortening", async () => {
    const transcript = "a".repeat(MAX_REWRITE_CHARS + 1);
    const enqueueRewrite = vi.fn().mockResolvedValue(undefined);
    const sync = { enqueueRewrite } as unknown as EventSyncApi;
    const task = (paused: boolean) => (
      <NextIntlClientProvider locale="fr" messages={messages}>
        <RewriteTask sync={sync} productionId="production" sentence={{ text: "Prima frase.", nativeText: null, errors: [] }}
          index={0} language="it" paused={paused} />
      </NextIntlClientProvider>
    );
    const { rerender } = render(task(false));
    await userEvent.click(screen.getByRole("button", { name: "Dicter la phrase 1" }));
    act(() => last().hear(transcript));
    rerender(task(true));
    expect(last().stopped).toBe(1);
    rerender(task(false));
    const field = screen.getByRole<HTMLTextAreaElement>("textbox");
    expect(field.value).toBe(transcript);
    const submit = screen.getByRole<HTMLButtonElement>("button", { name: "Vérifier ma réécriture" });
    expect(submit.disabled).toBe(true);
    fireEvent.submit(field.form!);
    expect(enqueueRewrite).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: "Prima frase." } });
    await userEvent.click(submit);
    expect(enqueueRewrite).toHaveBeenCalledWith("production", 0, "Prima frase.");
  });
});
