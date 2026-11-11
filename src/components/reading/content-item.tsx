import { ExternalIcon } from "@/components/icons";
import { languageStyle } from "@/components/ui/language-style";
import { Pill } from "@/components/ui/primitives";
import { formatTimeAgo } from "@/lib/domain/dates";
import { CONTENT_TYPE_LABELS, topicLabel } from "@/lib/domain/labels";
import { languageInfo } from "@/lib/domain/languages";
import { sourceTraitLabels } from "@/lib/content/source-traits";
import { youtubeVideoId } from "@/lib/content/youtube";
import type { ContentListItem, SourceInfo } from "@/lib/schemas/content";
import { AudioPlayer } from "./audio-player";
import { WatchHere } from "./watch-here";

/** "CC BY 3.0" linked to the licence, or the publisher's terms for all-rights-reserved sources. */
export function LicenseLink({ license }: { license: SourceInfo["license"] }) {
  return (
    <a
      href={license.url ?? license.termsUrl}
      target="_blank"
      rel="noopener noreferrer license"
      className="underline decoration-line underline-offset-2 hover:text-ink"
    >
      {license.name}
    </a>
  );
}

/**
 * One content of the reading list. Only what the feed published is shown (title, teaser, source),
 * always credited and linked to the publisher, where the content is read or listened to.
 */
export function ContentItem({ item, now, timeZone }: { item: ContentListItem; now: Date; timeZone: string }) {
  const info = languageInfo(item.language);
  const style = languageStyle(item.language);
  const videoId = item.type === "video" ? youtubeVideoId(item.url) : null;
  const published = item.publishedAt ? formatTimeAgo(new Date(item.publishedAt), now, timeZone) : null;
  return (
    <article className="flex min-w-0 flex-1 flex-col">
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="kicker text-muted">
          <span className={`${style.text} font-bold`}>{info.nameFr}</span>
          {" · "}
          <span className="text-ink-soft">{item.source.name}</span>
          {published && ` · ${published}`}
        </p>
        <h2 className="mt-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            lang={item.language}
            dir={info.dir}
            className="font-serif text-xl leading-snug font-bold text-balance hover:underline"
          >
            {item.title}
            <ExternalIcon width={13} height={13} className="ms-1 inline align-baseline text-muted" />
          </a>
        </h2>
        {item.summary !== item.title && (
          <p lang={item.language} dir={info.dir} className="mt-2 line-clamp-4 text-[15px] leading-relaxed text-ink-soft">
            {item.summary}
          </p>
        )}
        {videoId && <WatchHere videoId={videoId} title={item.title} language={item.language} />}
        {item.type === "podcast" && item.audioUrl && <AudioPlayer audioUrl={item.audioUrl} title={item.title} />}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
          <Pill>{CONTENT_TYPE_LABELS[item.type]}</Pill>
          <Pill>{item.difficulty}</Pill>
          <Pill>≈ {item.durationMinutes} min</Pill>
          {item.topics.map((topic) => (
            <Pill key={topic}>{topicLabel(topic)}</Pill>
          ))}
          {sourceTraitLabels(item.source.key).map((label) => (
            <Pill key={label}>{label}</Pill>
          ))}
          {item.source.access !== "free" && (
            <Pill>{item.source.access === "metered" ? "Abonnement possible" : "Abonnés"}</Pill>
          )}
          <span className="ms-auto text-[11px] text-muted">
            <LicenseLink license={item.source.license} />
          </span>
        </div>
      </div>
    </article>
  );
}
