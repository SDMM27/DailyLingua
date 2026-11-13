"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatReport, type ReportLine } from "@/lib/lab/report";
import { LabCard, LabResult } from "./lab-card";

interface VoicesCardProps {
  /** ISO code of the language learned, also the speech language tag. */
  language: string;
  languageName: string;
  /** The sentence to read. */
  phrase: string;
  /** Regions whose voices speak this language (a "zh-HK" voice speaks Cantonese), from the registry. */
  regions?: readonly string[];
}

/** The voices are loaded asynchronously on some browsers: wait for them, but not for ever. */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synthesis = window.speechSynthesis;
    const now = synthesis.getVoices();
    if (now.length > 0) return resolve(now);
    const done = () => {
      synthesis.removeEventListener("voiceschanged", done);
      resolve(synthesis.getVoices());
    };
    synthesis.addEventListener("voiceschanged", done);
    setTimeout(done, 2000);
  });
}

function speaks(voice: SpeechSynthesisVoice, language: string, regions?: readonly string[]): boolean {
  const tag = voice.lang.toLowerCase().replace("_", "-");
  if (tag === language) return true;
  if (!tag.startsWith(`${language}-`)) return false;
  return !regions || regions.some((region) => tag.endsWith(`-${region.toLowerCase()}`));
}

/** Lists the speech voices for the language learned and reads a sentence with one of them. */
export function VoicesCard({ language, languageName, phrase, regions }: VoicesCardProps) {
  const t = useTranslations("lab");
  const [report, setReport] = useState("");
  const [speaking, setSpeaking] = useState(false);

  async function run() {
    if (typeof speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined") {
      setReport(formatReport([[t("voices.title"), t("voices.unsupported")]]));
      return;
    }
    const voices = await loadVoices();
    const matching = voices.filter((voice) => speaks(voice, language, regions));
    const chosen = matching.find((voice) => voice.localService) ?? matching[0];

    const lines: ReportLine[] = [
      [t("voices.language"), `${languageName} (${language})`],
      [t("voices.total"), String(voices.length)],
      [t("voices.matching"), String(matching.length)],
    ];
    for (const voice of matching.slice(0, 8)) {
      lines.push([voice.name, `${voice.lang}, ${voice.localService ? t("voices.local") : t("voices.remote")}`]);
    }
    if (!chosen) lines.push([t("voices.voice"), t("voices.noVoice")]);
    else lines.push([t("voices.voice"), chosen.name]);
    lines.push([t("voices.phrase"), phrase]);
    setReport(formatReport(lines));

    setSpeaking(true);
    const outcome = await new Promise<ReportLine[]>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = chosen?.lang ?? language;
      if (chosen) utterance.voice = chosen;
      const events: ReportLine[] = [];
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        resolve(events);
      };
      // A browser that never says "end" must not leave the button disabled.
      const timeout = setTimeout(finish, 10_000);
      utterance.onstart = () => events.push([t("voices.started"), t("value.yes")]);
      utterance.onend = () => {
        events.push([t("voices.ended"), t("value.yes")]);
        finish();
      };
      utterance.onerror = (event) => {
        events.push([t("voices.errorCode"), event.error]);
        finish();
      };
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    });
    setSpeaking(false);
    setReport(formatReport([...lines, ...outcome]));
  }

  return (
    <LabCard title={t("voices.title")} hint={t("voices.hint", { language: languageName })}>
      <Button variant="secondary" onClick={run} disabled={speaking}>
        {speaking ? t("voices.speaking") : t("voices.run")}
      </Button>
      <LabResult text={report} />
    </LabCard>
  );
}
