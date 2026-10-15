import type { ComponentType, SVGProps } from "react";
import { BookIcon, ExternalIcon, HeadphonesIcon, InfoIcon, MicIcon, PlayIcon } from "@/components/icons";
import { Pill } from "@/components/ui/primitives";
import { CONTENT_TYPE_LABELS } from "@/lib/domain/labels";
import type { ContentType } from "@/lib/schemas/common";
import type { Content } from "@/lib/schemas/mission";
import { NoAccessButton } from "./no-access-button";

const TYPE_ICONS: Record<ContentType, ComponentType<SVGProps<SVGSVGElement>>> = {
  article: BookIcon,
  podcast: HeadphonesIcon,
  video: PlayIcon,
  interview: MicIcon,
};

/** `sessionId` set: the learner can say they cannot read this content (see NoAccessButton). */
export function ContentCard({ content, sessionId }: { content: Content; sessionId?: string }) {
  const Icon = TYPE_ICONS[content.type];
  return (
    <article className="rounded-3xl bg-surface-sunk/60 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Pill>
          <Icon width={13} height={13} />
          {CONTENT_TYPE_LABELS[content.type]}
        </Pill>
        <Pill>{content.difficulty}</Pill>
        <Pill>{content.durationMinutes} min</Pill>
      </div>
      <p className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">{content.source.name}</p>
      <h3 lang={content.language} className="mt-1 font-serif text-[1.35rem] leading-snug font-semibold text-balance">
        {content.title}
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{content.summary}</p>

      {!content.transcriptAvailable && (
        <p className="mt-4 flex gap-2 rounded-2xl border border-line bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-ink-soft">
          <InfoIcon width={16} height={16} className="mt-0.5 shrink-0 text-muted" />
          <span>
            Pas de transcription accessible : les questions portent uniquement sur le titre et l’accroche
            publiés par la source.
          </span>
        </p>
      )}

      <a
        href={content.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-ink px-4 py-2 text-sm font-semibold transition-colors hover:bg-ink hover:text-paper"
      >
        Ouvrir sur {content.source.name}
        <ExternalIcon width={15} height={15} />
      </a>

      {sessionId && <NoAccessButton sessionId={sessionId} />}
    </article>
  );
}
