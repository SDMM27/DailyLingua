"use client";

import type { UnitItem } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ItemView, useKindLabel } from "./item-view";
import { ShellBody, ShellFooter } from "./unit-shell";

/**
 * The test: the items one after the other, no feedback and no second try. The answers are kept and handed over
 * together at the end, with the instant the test started.
 */
export function TestStep({ items, language, locale, onProgress, onFinish }: {
  items: UnitItem[];
  language: string;
  locale: "fr" | "en";
  onProgress?(share: number): void;
  onFinish(answers: { itemId: string; answer: string }[], startedAt: string): void;
}) {
  const t = useTranslations("unit");
  const kindLabel = useKindLabel();
  const startedAt = useRef(new Date().toISOString());
  const [position, setPosition] = useState(0);
  const [answers, setAnswers] = useState<{ itemId: string; answer: string }[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const item = items[position];
  if (!item) return null;
  const last = position === items.length - 1;

  function next() {
    if (answer === null || !item) return;
    const all = [...answers, { itemId: item.id, answer }];
    if (last) {
      onFinish(all, startedAt.current);
      return;
    }
    setAnswers(all);
    setAnswer(null);
    setPosition(position + 1);
    onProgress?.((position + 1) / items.length);
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); next(); }} className="contents">
      <ShellBody>
        <div className="space-y-5">
          <p className="meta">{kindLabel(item.kind)} · {t("testCount", { index: position + 1, total: items.length })}</p>
          <ItemView key={item.id} item={item} language={language} locale={locale} locked={false} wrong={false} onAnswer={setAnswer} />
        </div>
      </ShellBody>
      <ShellFooter>
        <Button type="submit" aria-disabled={answer === null} onClick={(event) => { if (answer === null) event.preventDefault(); }}>
          {t(last ? "testFinish" : "testNext")}
        </Button>
      </ShellFooter>
    </form>
  );
}
