// @vitest-environment jsdom
import { oralSentences } from "@dailylingua/content";
import { loadMessages } from "@dailylingua/i18n";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toPacketSentence, type OralPacket } from "@/lib/oral/select-oral";
import type { UnitEvent } from "@/lib/units/events";
import { OralWorkshop } from "./oral-workshop";

const messages = await loadMessages("fr");
const [first, second, third] = oralSentences("it").map((sentence) => toPacketSentence(sentence, "fr"));
const packet: OralPacket = { language: "it", sentences: [first!, second!], dictation: [third!] };

/** A stand-in for the browser's `SpeechRecognition`; the test plays the part of the speech service. */
class FakeRecognition {
  static last: FakeRecognition | null = null;
  lang = "";
  interimResults = false;
  continuous = true;
  maxAlternatives = 0;
  onresult: ((event: { results: unknown[] }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() { FakeRecognition.last = this; }
  start() { /* The service starts listening. */ }
  stop() { this.onend?.(); }
  abort() { /* Nothing is delivered. */ }
  hear(text: string) { this.onresult?.({ results: [Object.assign([{ transcript: text }], { isFinal: false })] }); }
}

class FakeAudio {
  src = "";
  playbackRate = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() { return Promise.resolve(); }
  pause() { /* Nothing to stop. */ }
}

const scope = window as unknown as Record<string, unknown>;

function mount(overrides: { offline?: boolean } = {}) {
  const events: UnitEvent[] = [];
  const onLeave = vi.fn();
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <OralWorkshop
        packet={packet}
        languageName="italien"
        units={["Saluer et se présenter"]}
        locale="fr"
        tolerance="lenient"
        xpVisible
        offline={overrides.offline ?? false}
        onEvents={async (batch) => { events.push(...batch); }}
        checkDelivery={async () => true}
        onLeave={onLeave}
      />
    </NextIntlClientProvider>,
  );
  return { events, onLeave };
}

beforeEach(() => {
  FakeRecognition.last = null;
  vi.stubGlobal("Audio", FakeAudio);
  // Node ships its own `localStorage` global, which hides the one of jsdom: a plain one is the same for the code.
  const store = new Map<string, string>([["dailylingua-speech-privacy", "1"]]);
  vi.stubGlobal("localStorage", { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) });
});

afterEach(() => {
  delete scope.webkitSpeechRecognition;
  vi.unstubAllGlobals();
});

const button = (name: string | RegExp) => screen.getByRole("button", { name });

async function startAndReveal(user: ReturnType<typeof userEvent.setup>, rating: string) {
  await user.click(button("Commencer"));
  await user.click(button("Écouter la réponse"));
  await user.click(button(rating));
}

describe("« À voix haute »", () => {
  it("walks the three parts with the device recognition: events, comparison, dictation, result", async () => {
    scope.webkitSpeechRecognition = FakeRecognition;
    const user = userEvent.setup();
    const { events, onLeave } = mount();

    // The entry says where the voice goes and what is in the series.
    expect(screen.getByText(/jamais ta voix/)).toBeTruthy();
    await startAndReveal(user, "Je l’avais");

    // First sentence repeated right: written verdict, estimated XP, no 100 % claim beyond the words.
    await user.click(button("Répéter la phrase"));
    act(() => FakeRecognition.last!.hear(first!.text));
    await user.click(button("Arrêter et comparer"));
    const sheet = screen.getByRole("status", { name: "Bien repris" });
    expect(within(sheet).getByText("+1 XP")).toBeTruthy();
    await user.click(within(sheet).getByRole("button", { name: "Continuer" }));

    // Second sentence: not known, then repeated badly twice: calm « À reprendre », no XP, no third try.
    await user.click(button("Écouter la réponse"));
    await user.click(button("Pas encore"));
    await user.click(button("Répéter la phrase"));
    act(() => FakeRecognition.last!.hear("qualcosa di completamente diverso"));
    await user.click(button("Arrêter et comparer"));
    let retry = screen.getByRole("status", { name: "À reprendre" });
    expect(within(retry).queryByText(/XP/)).toBeNull();
    await user.click(within(retry).getByRole("button", { name: "Réessayer" }));
    await user.click(button("Répéter la phrase"));
    act(() => FakeRecognition.last!.hear("ancora un'altra cosa"));
    await user.click(button("Arrêter et comparer"));
    retry = screen.getByRole("status", { name: "À reprendre" });
    expect(within(retry).queryByRole("button", { name: "Réessayer" })).toBeNull();
    await user.click(within(retry).getByRole("button", { name: "Passer à la suite" }));

    // The dictation, typed right.
    await user.type(screen.getByRole("textbox", { name: "Ta dictée" }), third!.text);
    await user.click(button("Vérifier"));
    const verdict = screen.getByRole("status", { name: "Juste" });
    expect(within(verdict).getByText("+2 XP")).toBeTruthy();
    await user.click(within(verdict).getByRole("button", { name: "Continuer" }));

    // The end: the estimate (1 + 2) says it is an estimate, then that it was sent.
    expect(screen.getByRole("heading", { name: "« À voix haute » terminé" })).toBeTruthy();
    expect(await screen.findByText("≈ +3 XP · envoyé au serveur")).toBeTruthy();
    await user.click(button("Terminer"));
    expect(onLeave).toHaveBeenCalled();

    expect(events.map((event) => event.kind === "oral_attempt" && [event.payload.activity, event.payload.recognizer, event.payload.selfRating])).toEqual([
      ["anticipation", "none", "got_it"],
      ["shadowing", "device", null],
      ["anticipation", "none", "not_yet"],
      ["shadowing", "device", null],
      ["shadowing", "device", null],
      ["dictation", "none", null],
    ]);
    const spoken = events.find((event) => event.kind === "oral_attempt" && event.payload.activity === "shadowing");
    expect(spoken?.kind === "oral_attempt" && spoken.payload.answer).toBe(first!.text);
  });

  it("without recognition, the repetition is self-rated, declared, and records nothing", async () => {
    const user = userEvent.setup();
    const { events } = mount();
    await startAndReveal(user, "Presque");

    expect(screen.queryByRole("button", { name: "Répéter la phrase" })).toBeNull();
    expect(screen.getByText(/ne reconnaît pas la parole/)).toBeTruthy();
    expect(screen.getByText("Déclaré · sans XP")).toBeTruthy();
    await user.click(button("Proche"));

    expect(events.at(-1)).toMatchObject({ kind: "oral_attempt", payload: { activity: "shadowing", recognizer: "none", selfRating: "almost", answer: "" } });
    // Next sentence: anticipation again.
    expect(screen.getByRole("button", { name: "Écouter la réponse" })).toBeTruthy();
  });

  it("falls back to the self-rating when the microphone is refused", async () => {
    scope.webkitSpeechRecognition = FakeRecognition;
    const user = userEvent.setup();
    mount();
    await startAndReveal(user, "Je l’avais");
    await user.click(button("Répéter la phrase"));
    act(() => FakeRecognition.last!.onerror?.({ error: "not-allowed" }));
    expect(await screen.findByText(/Le micro est bloqué/)).toBeTruthy();
    expect(button("Pas encore")).toBeTruthy();
  });

  it("asks to try again when nothing was heard, and keeps the mic", async () => {
    scope.webkitSpeechRecognition = FakeRecognition;
    const user = userEvent.setup();
    mount();
    await startAndReveal(user, "Je l’avais");
    await user.click(button("Répéter la phrase"));
    await user.click(button("Arrêter et comparer"));
    expect(screen.getByText("On n’a rien entendu, réessaie.")).toBeTruthy();
    expect(button("Répéter la phrase")).toBeTruthy();
  });

  it("shows the privacy sheet once, before the first listening", async () => {
    scope.webkitSpeechRecognition = FakeRecognition;
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined });
    const user = userEvent.setup();
    mount();
    await startAndReveal(user, "Je l’avais");
    await user.click(button("Répéter la phrase"));
    const dialog = screen.getByRole("dialog", { name: "Avant de parler" });
    expect(within(dialog).getByText(/DailyLingua ne reçoit que le texte/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Compris" }));
    expect(screen.getByRole("button", { name: "Arrêter et comparer" })).toBeTruthy();
  });

  it("says the XP is waiting for the network until the queue is delivered", async () => {
    scope.webkitSpeechRecognition = FakeRecognition;
    const user = userEvent.setup();
    const events: UnitEvent[] = [];
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <OralWorkshop packet={{ ...packet, sentences: [first!], dictation: [] }} languageName="italien" units={[]} locale="fr" tolerance="lenient" xpVisible offline
          onEvents={async (batch) => { events.push(...batch); }} checkDelivery={async () => false} onLeave={vi.fn()} />
      </NextIntlClientProvider>,
    );
    await startAndReveal(user, "Je l’avais");
    await user.click(button("Répéter la phrase"));
    act(() => FakeRecognition.last!.hear(first!.text));
    await user.click(button("Arrêter et comparer"));
    await user.click(within(screen.getByRole("status", { name: "Bien repris" })).getByRole("button", { name: "Continuer" }));
    expect(await screen.findByText("≈ +1 XP · en attente du réseau")).toBeTruthy();
  });
});
