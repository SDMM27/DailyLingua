"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * One check of the lab: a card folded by default (the page is long), with its explanation, its
 * controls and its result. The title is the only thing visible when folded.
 */
export function LabCard({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <details className="group rounded-card border border-line bg-surface">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-lg font-semibold [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <svg
          viewBox="0 0 24 24"
          className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="space-y-5 border-t border-line px-5 py-5">
        <p className="text-muted">{hint}</p>
        {children}
      </div>
    </details>
  );
}

/** The result of a check as readable text, with a button that copies it. */
export function LabResult({ text }: { text: string }) {
  const t = useTranslations("lab.result");
  // The outcome belongs to the text that was copied: a new result starts again without a status.
  const [copied, setCopied] = useState<{ text: string; ok: boolean } | null>(null);
  const copy = copied?.text !== text ? "idle" : copied.ok ? "done" : "failed";

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ text, ok: true });
    } catch {
      setCopied({ text, ok: false });
    }
  }

  return (
    <div className="space-y-3">
      <p className="meta">{t("label")}</p>
      <pre
        tabIndex={0}
        className="max-h-80 overflow-auto rounded-xl border border-line bg-bg p-4 font-mono text-sm break-words whitespace-pre-wrap select-text"
      >
        {text === "" ? t("empty") : text}
      </pre>
      {text !== "" && (
        <>
          <Button variant="secondary" onClick={copyText}>
            {t("copy")}
          </Button>
          <p role="status" className="text-sm text-muted">
            {copy === "done" ? t("copied") : copy === "failed" ? t("copyFailed") : ""}
          </p>
        </>
      )}
    </div>
  );
}
