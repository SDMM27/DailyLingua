const KEY = "dailylingua-speech-privacy";

/** Whether the learner has read the note on where the voice goes (stored on this device only). A blocked storage reads as not seen. */
export function speechPrivacySeen(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markSpeechPrivacySeen(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Storage blocked: the note is shown again next time.
  }
}
