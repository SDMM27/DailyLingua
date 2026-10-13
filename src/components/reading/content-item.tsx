import { ExternalIcon } from "@/components/icons";
import { languageStyle } from "@/components/ui/language-style";
import { Pill } from "@/components/ui/primitives";
import { formatTimeAgo } from "@/lib/domain/dates";
import { CONTENT_TYPE_LABELS } from "@/lib/domain/labels";
import { languageInfo } from "@/lib/domain/languages";
import type { ContentListItem, SourceInfo } from "@/lib/schemas/content";

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
  const published = item.publishedAt ? formatTimeAgo(new Date(item.publishedAt), now, timeZone) : null;
  return (
    <article className="flex gap-3 border-b border-line py-4 last:border-b-0">
      <span className={`mt-1.5 w-1 shrink-0 self-stretch rounded-full ${style.bg}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">
          <span className="font-medium text-ink-soft">{item.source.name}</span>
          {published && ` · ${published}`}
        </p>
        <h2 className="mt-1">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            lang={item.language}
            dir={info.dir}
            className="font-serif text-[17px] leading-snug font-semibold text-balance hover:underline"
          >
            {item.title}
            <ExternalIcon width={13} height={13} className="ms-1 inline align-baseline text-muted" />
          </a>
        </h2>
        {item.summary !== item.title && (
          <p lang={item.language} dir={info.dir} className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-ink-soft">
            {item.summary}
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Pill>{CONTENT_TYPE_LABELS[item.type]}</Pill>
          <Pill>{item.difficulty}</Pill>
          <Pill>≈ {item.durationMinutes} min</Pill>
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
