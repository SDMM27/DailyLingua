export interface TickerItem {
  /** Short label before the title (language code, rubric). */
  label: string;
  title: string;
  /** HTML lang of the title. */
  lang?: string;
  dir?: "ltr" | "rtl";
}

/**
 * "Parutions" strip: titles scrolling past like a news ticker (@sdmm/design .sd-marquee). Under
 * prefers-reduced-motion the track stops and wraps, and its duplicate copy is hidden.
 */
export function Ticker({ items, label = "Parutions" }: { items: TickerItem[]; label?: string }) {
  if (items.length === 0) return null;
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-9 pr-9" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <li key={i} className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="font-mono text-[11px] font-bold text-accent-strong">{item.label}</span>
          <span lang={item.lang} dir={item.dir} className="font-serif text-[15px] italic">
            {item.title}
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label={label} className="flex items-stretch overflow-hidden border-y border-line bg-surface-sunk">
      <span className="kicker relative z-10 flex shrink-0 items-center bg-accent px-3.5 text-accent-ink">{label}</span>
      <div className="min-w-0 flex-1 overflow-hidden py-2.5 pl-6">
        <div className="sd-marquee" style={{ ["--sd-marquee-duration" as string]: `${Math.max(30, items.length * 7)}s` }}>
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}
