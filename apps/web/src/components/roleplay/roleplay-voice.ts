"use client";

import { useEffect, useState } from "react";

const READ_ALOUD_KEY = "dailylingua-roleplay-read-aloud";

export function useRoleplayVoice(language: string) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice>();
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    const engine = window.speechSynthesis;
    if (!engine) return;
    const matchVoice = () => setVoice(engine.getVoices().find(({ lang }) => lang.toLowerCase().split(/[-_]/)[0] === language));
    engine.addEventListener("voiceschanged", matchVoice);
    const timer = window.setTimeout(() => {
      matchVoice();
      try { setAuto(localStorage.getItem(READ_ALOUD_KEY) === "true"); } catch { /* Preference is optional. */ }
    }, 0);
    return () => {
      window.clearTimeout(timer);
      engine.removeEventListener("voiceschanged", matchVoice);
      engine.cancel();
    };
  }, [language]);

  function speak(text: string) {
    if (!voice) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function changeAuto(value: boolean) {
    setAuto(value);
    try { localStorage.setItem(READ_ALOUD_KEY, String(value)); } catch { /* Keep the choice for this screen. */ }
  }

  return { available: Boolean(voice), auto, changeAuto, speak, stop: () => window.speechSynthesis?.cancel() };
}
