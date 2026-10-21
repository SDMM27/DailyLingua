// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductionTask as ProductionTaskData } from "@/lib/schemas/mission";
import type { WritingFeedback, WritingReviewState } from "@/lib/schemas/writing-feedback";
import { ProductionTask } from "./production-task";

const TEXT = "Ich habe gestern einen Artikel gelesen und ich fand ihn sehr interessant.";
const NATIVE = "Ich hab gestern einen Artikel gelesen, richtig spannend!";

const feedback: WritingFeedback = {
  scores: {
    grammar: { score: 4, comment: "Solide." },
    vocabulary: { score: 3, comment: "Correct." },
    register: { score: 3, comment: "Un peu écrit." },
    coherence: { score: 4, comment: "Clair." },
  },
  corrections: [],
  strength: "Phrases claires.",
  nativeVersion: NATIVE,
};

const review: WritingReviewState = { feedback, reviewedText: TEXT, attemptsLeft: 2 };

const spoken: ProductionTaskData = {
  mode: "spoken",
  prompt: "Schreib auf, was du einem Freund erzählen würdest.",
  hints: ["Écris comme tu parlerais"],
  targetLength: "30–50 mots",
};

type FakeVoice = { lang: string; localService: boolean; name: string };

/** A minimal `speechSynthesis`; voices can change later, then `voiceschanged` is dispatched. */
function installSpeech(voices: FakeVoice[]) {
  const listeners = new Set<() => void>();
  const synth = {
    getVoices: vi.fn(() => [...voices]),
    speak: vi.fn(),
    cancel: vi.fn(),
    addEventListener: vi.fn((_type: string, cb: () => void) => listeners.add(cb)),
    removeEventListener: vi.fn((_type: string, cb: () => void) => listeners.delete(cb)),
  };
  class FakeUtterance {
    voice: FakeVoice | null = null;
    lang = "";
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public text: string) {}
  }
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  return {
    synth,
    setVoices(next: FakeVoice[]) {
      voices.splice(0, voices.length, ...next);
      act(() => listeners.forEach((cb) => cb()));
    },
  };
}

beforeEach(() => {
  // jsdom has no speech synthesis: start from a device without voices.
  vi.stubGlobal("speechSynthesis", undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ProductionTask, spoken mode", () => {
  it("is titled 'Écrire puis dire' and keeps the writing area", () => {
    render(<ProductionTask language="de" task={spoken} />);
    expect(screen.getByText("Écrire puis dire")).toBeTruthy();
    expect(screen.getByText("· 30–50 mots")).toBeTruthy();
    expect(screen.getByLabelText("Ton texte")).toBeTruthy();
    expect(screen.queryByText("À voix haute")).toBeNull();
  });

  it("proposes the three steps after a correction", () => {
    render(<ProductionTask language="de" task={spoken} initialText={TEXT} initialReview={review} />);
    const block = screen.getByRole("region", { name: "À voix haute" });
    expect(block.textContent).toContain("Lis la version du natif à voix haute, deux fois.");
    expect(block.textContent).toContain("redis ton texte de mémoire, en reprenant les corrections");
    expect(block.textContent).toContain("Réponds de nouveau à la consigne à voix haute, sans rien regarder.");
    expect(screen.getByText(NATIVE)).toBeTruthy();
  });

  it("hides and shows the native version", () => {
    render(<ProductionTask language="de" task={spoken} initialText={TEXT} initialReview={review} />);
    fireEvent.click(screen.getByRole("button", { name: "Masquer" }));
    expect(screen.queryByText(NATIVE)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Afficher" }));
    expect(screen.getByText(NATIVE)).toBeTruthy();
  });

  it("does not offer 'Écouter' without speech synthesis or without a local voice", () => {
    const { unmount } = render(
      <ProductionTask language="de" task={spoken} initialText={TEXT} initialReview={review} />,
    );
    expect(screen.queryByRole("button", { name: "Écouter" })).toBeNull();
    unmount();

    installSpeech([
      { name: "cloud", lang: "de-DE", localService: false },
      { name: "local en", lang: "en-US", localService: true },
    ]);
    render(<ProductionTask language="de" task={spoken} initialText={TEXT} initialReview={review} />);
    expect(screen.queryByRole("button", { name: "Écouter" })).toBeNull();
  });

  it("offers 'Écouter' once a local voice of the language is loaded, and reads the native version", () => {
    const speech = installSpeech([]);
    render(<ProductionTask language="de" task={spoken} initialText={TEXT} initialReview={review} />);
    expect(screen.queryByRole("button", { name: "Écouter" })).toBeNull();

    const voice = { name: "Anna", lang: "de_DE", localService: true };
    speech.setVoices([voice]);
    fireEvent.click(screen.getByRole("button", { name: "Écouter" }));
    expect(speech.synth.speak).toHaveBeenCalledTimes(1);
    const utterance = speech.synth.speak.mock.calls[0][0];
    expect(utterance).toMatchObject({ text: NATIVE, voice, lang: "de_DE" });

    // Clicking again stops it and brings the button back.
    fireEvent.click(screen.getByRole("button", { name: "Arrêter" }));
    expect(speech.synth.cancel).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Écouter" })).toBeTruthy();
  });

  it("works on the learner's own text when no correction can be requested", () => {
    render(<ProductionTask language="de" task={spoken} initialText={TEXT} />);
    const block = screen.getByRole("region", { name: "À voix haute" });
    expect(block.textContent).toContain("Lis ton texte à voix haute, deux fois.");
    expect(screen.queryByRole("button", { name: "Écouter" })).toBeNull();
    expect(block.textContent).toContain(TEXT);
    fireEvent.click(screen.getByRole("button", { name: "Masquer" }));
    expect(block.textContent).not.toContain(TEXT);
  });

  it("waits for the correction when it can be requested, and falls back on the own text when it cannot come", () => {
    const onRequestFeedback = vi.fn(async () => null);
    const { unmount } = render(
      <ProductionTask language="de" task={spoken} initialText={TEXT} onRequestFeedback={onRequestFeedback} />,
    );
    expect(screen.queryByRole("region", { name: "À voix haute" })).toBeNull();
    unmount();

    render(
      <ProductionTask
        language="de"
        task={spoken}
        initialText={TEXT}
        onRequestFeedback={onRequestFeedback}
        initialReview={{ feedback: null, reviewedText: null, attemptsLeft: 0 }}
      />,
    );
    expect(screen.getByRole("region", { name: "À voix haute" })).toBeTruthy();
  });

  it("does not show the block for a text that is too short", () => {
    render(<ProductionTask language="de" task={spoken} initialText="Hallo" />);
    expect(screen.queryByRole("region", { name: "À voix haute" })).toBeNull();
  });
});

describe("ProductionTask, other modes", () => {
  it("keeps a written task without the speaking steps", () => {
    const writing: ProductionTaskData = { mode: "writing", prompt: "Schreib.", hints: [] };
    render(<ProductionTask language="de" task={writing} initialText={TEXT} initialReview={review} />);
    expect(screen.getByText("Production écrite")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "À voix haute" })).toBeNull();
  });

  it("still renders a stored speaking-only task, without a text area", () => {
    const legacy: ProductionTaskData = {
      mode: "speaking",
      prompt: "Racconta la tua giornata.",
      hints: ["Parle lentement"],
    };
    render(<ProductionTask language="it" task={legacy} />);
    expect(screen.getByText("Production orale")).toBeTruthy();
    expect(screen.getByText("Racconta la tua giornata.")).toBeTruthy();
    expect(screen.getByText("Parle à voix haute, même seul·e : le but est la fluidité.")).toBeTruthy();
    expect(screen.queryByLabelText("Ton texte")).toBeNull();
    expect(screen.queryByText(/dictaphone/)).toBeNull();
  });
});
