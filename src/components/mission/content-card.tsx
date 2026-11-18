import { ExternalIcon, InfoIcon } from "@/components/icons";
import { AudioPlayer } from "@/components/reading/audio-player";
import { YouTubePlayer } from "@/components/reading/youtube-player";
import { languageStyle } from "@/components/ui/language-style";
import { buttonClass, Pill } from "@/components/ui/primitives";
import { traitLabels } from "@/lib/content/trait-labels";
import { youtubeVideoId } from "@/lib/content/youtube";
import { CONTENT_TYPE_LABELS } from "@/lib/domain/labels";
import { languageInfo } from "@/lib/domain/languages";
import type { Content } from "@/lib/schemas/mission";
import { NoAccessButton } from "./no-access-button";

/**
 * One content as the lead article of the session: kicker (language, type, source, level), headline,
 * standfirst, then the player and the link to the publisher. `sessionId` set: the learner can say
 * they cannot read this content (see NoAccessButton).
 */
export function ContentCard({ content, sessionId }: { content: Content; sessionId?: string }) {
  const style = languageStyle(content.language);
  const videoId = content.type === "video" ? youtubeVideoId(content.url) : null;
  return (
    <article className="min-w-0">
      <p className="kicker text-muted">
        <span className={`${style.text} font-bold`}>{languageInfo(content.language).nameFr}</span>
        {" · "}
        {CONTENT_TYPE_LABELS[content.type]}
        {" · "}
        {content.source.name}
        {" · "}
        {content.difficulty}
      </p>
      <div className={videoId ? "mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-10" : "mt-3"}>
        <div className="min-w-0">
          <h3
            lang={content.language}
            className="sd-display text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.1] text-balance"
          >
            {content.title}
          </h3>
          <p className="mt-3 max-w-[68ch] font-serif text-lg leading-relaxed text-ink-soft">{content.summary}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Pill>{content.durationMinutes} min</Pill>
            {traitLabels(content.source.traits ?? {}).map((label) => (
              <Pill key={label}>{label}</Pill>
            ))}
          </div>

          {!content.transcriptAvailable && (
            <p className="mt-4 flex max-w-[68ch] gap-2 border-y border-dashed border-line py-3 text-[13px] leading-relaxed text-ink-soft">
              <InfoIcon width={16} height={16} className="mt-0.5 shrink-0 text-muted" />
              <span>
                Pas de transcription accessible : les questions portent uniquement sur le titre et l’accroche
                publiés par la source.
              </span>
            </p>
          )}

          {content.type === "podcast" && content.audioUrl && (
            <div className="mt-4 max-w-[68ch]">
              <AudioPlayer audioUrl={content.audioUrl} title={content.title} />
            </div>
          )}

          <a href={content.url} target="_blank" rel="noopener noreferrer" className={`${buttonClass.secondary} mt-5`}>
            Ouvrir sur {content.source.name}
            <ExternalIcon width={15} height={15} />
          </a>

          {sessionId && <NoAccessButton sessionId={sessionId} />}
        </div>
        {videoId && (
          <div className="min-w-0">
            <YouTubePlayer videoId={videoId} title={content.title} language={content.language} />
          </div>
        )}
      </div>
    </article>
  );
}
