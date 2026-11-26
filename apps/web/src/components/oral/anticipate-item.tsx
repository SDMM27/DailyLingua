"use client";

import type { OralSelfRating } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/unit/icons";
import { ShellBody, ShellFooter } from "@/components/unit/unit-shell";
import { useClip } from "@/components/unit/use-clip";
import type { OralPacketSentence } from "@/lib/oral/select-oral";
import { DeclaredChip, ReplayButton, SLOW_RATE, SlowToggle } from "./oral-audio";

/**
 * Anticipation: the meaning in the learner's language, a moment to say the sentence aloud, then the voice and the text,
 * and a self-rating in three buttons. Declared and without XP: nothing here judges what was said.
 */
export function AnticipateItem({ sentence, language, languageName, locale, index, total, onRate }: {
  sentence: OralPacketSentence;
  language: string;
  languageName: string;
  locale: "fr" | "en";
  index: number;
  total: number;
  /** `shownAt` and `revealedAt` bound the moment the learner had to say the sentence (epoch ms). */
  onRate(rating: OralSelfRating, times: { shownAt: number; revealedAt: number }): void;
}) {
  const t = useTranslations("oral.anticipate");
  const repeat = useTranslations("oral.repeat");
  const unit = useTranslations("unit");
  const clip = useClip();
  const [slow, setSlow] = useState(false);
  const [revealedAt, setRevealedAt] = useState<number | null>(null);
  const shownAt = useRef(new Date().getTime());
  const unavailable = clip.state === "unavailable";

  function reveal() {
    setRevealedAt(Date.now());
    clip.play(sentence.audio, { rate: slow ? SLOW_RATE : 1 });
  }

  const ratings: { rating: OralSelfRating; label: string }[] = [
    { rating: "got_it", label: t("had") },
    { rating: "almost", label: t("almost") },
    { rating: "not_yet", label: t("notYet") },
  ];

  if (revealedAt === null) {
    return (
      <>
        <ShellBody>
          <div className="flex flex-col gap-8 pt-7">
            <h1 className="meta text-lang">{t("instruction", { language: languageName, index, total })}</h1>
            <p className="font-display text-[30px] leading-[1.25] font-semibold tracking-tight" lang={locale}>{sentence.translation}</p>
            <p className="text-sm text-muted">{t("hint")}</p>
          </div>
        </ShellBody>
        <ShellFooter>
          <Button onClick={reveal}>
            <Icon name="speaker" />
            {t("reveal")}
          </Button>
        </ShellFooter>
      </>
    );
  }

  return (
    <>
      <ShellBody>
        <div className="flex flex-col gap-8 pt-7">
          <div>
            <h1 className="meta text-lang">{t("instruction", { language: languageName, index, total })}</h1>
            <p className="mt-3 font-display text-[19px] leading-snug text-muted" lang={locale}>{sentence.translation}</p>
          </div>
          <p className="font-display text-[28px] leading-[1.3] font-semibold tracking-tight" lang={language} dir="auto">{sentence.text}</p>
          <div className="flex items-center gap-3">
            <ReplayButton label={repeat("replay")} disabled={unavailable} onClick={() => clip.play(sentence.audio, { rate: slow ? SLOW_RATE : 1 })} />
            <SlowToggle slow={slow} onToggle={() => setSlow((value) => !value)} />
          </div>
          {unavailable && <p role="status" className="text-sm text-muted">{unit("audioUnavailable")}</p>}
        </div>
      </ShellBody>
      <ShellFooter>
        <div role="group" aria-label={t("question")} className="grid grid-cols-3 gap-2">
          {ratings.map(({ rating, label }) => (
            <Button key={rating} variant="secondary" className="min-h-[52px] w-full px-2 text-[15px]" onClick={() => { clip.stop(); onRate(rating, { shownAt: shownAt.current, revealedAt }); }}>
              {label}
            </Button>
          ))}
        </div>
        <p className="mt-3 flex justify-center"><DeclaredChip /></p>
      </ShellFooter>
    </>
  );
}
