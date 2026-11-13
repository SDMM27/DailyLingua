"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatReport, type ReportLine } from "@/lib/lab/report";
import { LabCard, LabResult } from "./lab-card";

/** The parts of the Web Speech recognition API this check uses (TypeScript's DOM library has none). */
interface RecognitionResultAlternative {
  transcript: string;
  confidence: number;
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<RecognitionResultAlternative> & { isFinal: boolean }>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionApi(): { name: string; Recognition: RecognitionConstructor } | null {
  const scope = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  if (scope.SpeechRecognition) return { name: "SpeechRecognition", Recognition: scope.SpeechRecognition };
  if (scope.webkitSpeechRecognition) return { name: "webkitSpeechRecognition", Recognition: scope.webkitSpeechRecognition };
  return null;
}

/** Whether the browser recognises speech, and what it makes of one sentence. */
export function RecognitionCard({ language, languageName }: { language: string; languageName: string }) {
  const t = useTranslations("lab");
  const locale = useLocale();
  const [report, setReport] = useState("");
  const [listening, setListening] = useState(false);

  async function run() {
    const api = recognitionApi();
    if (!api) {
      setReport(formatReport([[t("recognition.available"), t("value.no")], [t("recognition.title"), t("recognition.unsupported")]]));
      return;
    }
    setListening(true);
    const lines: ReportLine[] = [
      [t("recognition.available"), t("value.yes")],
      [t("recognition.api"), api.name],
    ];
    const outcome = await new Promise<ReportLine[]>((resolve) => {
      const recognition = new api.Recognition();
      recognition.lang = language;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      const found: ReportLine[] = [];
      let transcript = "";
      let confidence: number | null = null;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        if (transcript) {
          found.push([t("recognition.transcript"), transcript]);
          if (confidence !== null) {
            found.push([t("recognition.confidence"), new Intl.NumberFormat(locale, { style: "percent" }).format(confidence)]);
          }
        } else if (found.length === 0) {
          found.push([t("recognition.transcript"), t("recognition.nothingHeard")]);
        }
        resolve(found);
      };
      // Some browsers never end the session by themselves.
      const timeout = setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // Already stopped.
        }
        finish();
      }, 10_000);
      recognition.onresult = (event) => {
        transcript = Array.from(event.results, (result) => result[0]?.transcript ?? "").join(" ").trim();
        const last = event.results[event.results.length - 1]?.[0];
        confidence = last && last.confidence > 0 ? last.confidence : null;
      };
      recognition.onerror = (event) => found.push([t("recognition.errorCode"), event.error]);
      recognition.onend = finish;
      try {
        recognition.start();
      } catch (error) {
        found.push([t("recognition.errorCode"), error instanceof Error ? `${error.name}: ${error.message}` : String(error)]);
        finish();
      }
    });
    setListening(false);
    setReport(formatReport([...lines, ...outcome]));
  }

  return (
    <LabCard title={t("recognition.title")} hint={t("recognition.hint", { language: languageName })}>
      <Button variant="secondary" onClick={run} disabled={listening}>
        {listening ? t("recognition.listening") : t("recognition.run")}
      </Button>
      <LabResult text={report} />
    </LabCard>
  );
}
