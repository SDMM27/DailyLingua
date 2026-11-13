"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { errorMessage, formatReport, type ReportLine } from "@/lib/lab/report";
import { LabCard, LabResult } from "./lab-card";

const RECORD_SECONDS = 5;
/** Candidates, most useful first: Safari records MP4/AAC, Chromium and Firefox WebM or Ogg Opus. */
const MIME_CANDIDATES = [
  "audio/mp4",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/aac",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/wav",
];

type Permission = "granted" | "denied" | "prompt" | "unknown";

async function microphonePermission(): Promise<Permission> {
  try {
    // Safari does not know the "microphone" name: the answer is then "unknown", not an error.
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return status.state;
  } catch {
    return "unknown";
  }
}

/** Records 5 seconds from the microphone and plays them back. Nothing is sent anywhere. */
export function MicrophoneCard() {
  const t = useTranslations("lab");
  const locale = useLocale();
  const [report, setReport] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  // Free the recording when the page is left.
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  async function run() {
    setProblem(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setProblem(t("microphone.unsupported"));
      return;
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setAudioUrl(null);

    const lines: ReportLine[] = [];
    const permissionBefore = await microphonePermission();
    lines.push([t("microphone.permission"), t(`permission.${permissionBefore}`)]);
    const supported = MIME_CANDIDATES.filter((type) => MediaRecorder.isTypeSupported(type));
    lines.push([t("microphone.formats"), supported.length > 0 ? supported.join(", ") : t("value.none")]);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      lines.push([t("microphone.permission"), t("value.error", { message: errorMessage(error) })]);
      if (error instanceof DOMException && error.name === "NotAllowedError") setProblem(t("microphone.denied"));
      setReport(formatReport(lines));
      return;
    }

    try {
      const settings = stream.getAudioTracks()[0]?.getSettings() ?? {};
      const recorder = supported[0] ? new MediaRecorder(stream, { mimeType: supported[0] }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      const startedAt = performance.now();
      recorder.start(1000);
      for (let left = RECORD_SECONDS; left > 0; left--) {
        setSecondsLeft(left);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      recorder.stop();
      await stopped;
      const elapsed = (performance.now() - startedAt) / 1000;

      const type = recorder.mimeType || supported[0] || "";
      const blob = new Blob(chunks, { type });
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setAudioUrl(url);

      lines.push([t("microphone.formatUsed"), type || t("value.unknown")]);
      lines.push([t("microphone.size"), t("value.bytes", { value: new Intl.NumberFormat(locale).format(blob.size) })]);
      lines.push([t("microphone.chunks"), String(chunks.length)]);
      lines.push([t("microphone.duration"), t("value.seconds", { value: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(elapsed) })]);
      if (settings.sampleRate) lines.push([t("microphone.sampleRate"), `${settings.sampleRate} Hz`]);
      if (settings.channelCount) lines.push([t("microphone.channels"), String(settings.channelCount)]);
      lines.push([t("microphone.permission"), t(`permission.${await microphonePermission()}`)]);
    } catch (error) {
      lines.push([t("microphone.title"), t("value.error", { message: errorMessage(error) })]);
    } finally {
      for (const track of stream.getTracks()) track.stop();
      setSecondsLeft(null);
    }
    setReport(formatReport(lines));
  }

  return (
    <LabCard title={t("microphone.title")} hint={t("microphone.hint")}>
      <Button variant="secondary" onClick={run} disabled={secondsLeft !== null}>
        {secondsLeft === null ? t("microphone.run") : t("microphone.recording", { seconds: secondsLeft })}
      </Button>
      <p className="text-sm text-muted">{t("microphone.privacy")}</p>
      {problem && (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      )}
      {audioUrl && <audio controls src={audioUrl} aria-label={t("microphone.playback")} className="w-full" />}
      <LabResult text={report} />
    </LabCard>
  );
}
