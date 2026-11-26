import { isTargetLanguage, languageInfo } from "@dailylingua/core";

/** Why a recognition stopped without a sentence. `denied`: the microphone or the speech service is blocked. */
export type RecognitionError = "denied" | "no-speech" | "failed";

/**
 * The speech recognition of the device, behind the smallest interface the app needs (`j5-pr1-atelier-oral.md` §6): a
 * provider (the browser's today, a server one later) is swapped by returning another object of this shape. Nothing here
 * records, keeps or sends audio, and the confidence of the recognition is never read.
 */
export interface Recognizer {
  /** Starts listening. Call it from a tap (iOS only accepts it from a user gesture). */
  start(): void;
  /** Stops listening and delivers what was heard so far through `onFinal`. */
  stop(): void;
  /** Stops listening and drops what was heard. Nothing is delivered. */
  abort(): void;
  /** What has been understood so far, while the learner speaks. */
  onPartial: ((text: string) => void) | null;
  /** The sentence, once: at the end of the recognition. */
  onFinal: ((text: string) => void) | null;
  onError: ((error: RecognitionError) => void) | null;
}

/** The part of the browser's `SpeechRecognition` this module uses (not in the DOM typings of every TypeScript version). */
interface BrowserRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface BrowserResultEvent {
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string }; length: number }>;
}

type BrowserRecognitionConstructor = new () => BrowserRecognition;

function recognitionConstructor(): BrowserRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as { SpeechRecognition?: BrowserRecognitionConstructor; webkitSpeechRecognition?: BrowserRecognitionConstructor };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/** Whether this browser can recognise speech at all (Firefox cannot). */
export function speechRecognitionSupported(): boolean {
  return recognitionConstructor() !== null;
}

/** The BCP 47 tag the recognition of a language listens for (`it-IT`); the code itself for a language outside the registry. */
export function recognitionTag(language: string): string {
  return isTargetLanguage(language) ? languageInfo(language).speech : language;
}

/** Errors that mean the learner or the device refuses to listen: no retry will help, the workshop falls back to self-rating. */
const DENIED = new Set(["not-allowed", "service-not-allowed"]);

/**
 * A recognizer for one sentence in `language`, or null when the browser has no `SpeechRecognition` /
 * `webkitSpeechRecognition`. One utterance (`continuous = false`) with interim results. It ends by itself when the
 * learner stops speaking; `onFinal` then carries the whole text (or `onError("no-speech")` when nothing was heard).
 */
export function createRecognizer(language: string): Recognizer | null {
  const Recognition = recognitionConstructor();
  if (!Recognition) return null;
  const engine = new Recognition();
  engine.lang = recognitionTag(language);
  engine.interimResults = true;
  engine.continuous = false;
  engine.maxAlternatives = 1;

  let heard = "";
  let failed = false;
  let dropped = false;
  const recognizer: Recognizer = {
    onPartial: null,
    onFinal: null,
    onError: null,
    start() {
      heard = "";
      failed = false;
      dropped = false;
      try {
        engine.start();
      } catch {
        // Starting twice throws `InvalidStateError`: the recognition is already running.
        failed = true;
        recognizer.onError?.("failed");
      }
    },
    stop: () => engine.stop(),
    abort() {
      dropped = true;
      engine.abort();
    },
  };

  engine.onresult = (event) => {
    // Only the text of the first alternative of each result: the confidence is never read.
    heard = Array.from(event.results, (result) => result[0].transcript).join(" ").replace(/\s+/g, " ").trim();
    if (!dropped) recognizer.onPartial?.(heard);
  };
  engine.onerror = (event) => {
    if (event.error === "aborted" || dropped) return;
    failed = true;
    recognizer.onError?.(DENIED.has(event.error) ? "denied" : event.error === "no-speech" ? "no-speech" : "failed");
  };
  engine.onend = () => {
    if (dropped || failed) return;
    if (heard === "") recognizer.onError?.("no-speech");
    else recognizer.onFinal?.(heard);
  };
  return recognizer;
}
