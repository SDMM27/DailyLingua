import type { HTMLAttributes, ReactNode } from "react";
import { languageInfo } from "@/lib/domain/languages";
import type { Language } from "@/lib/schemas/common";
import { languageStyle } from "./language-style";

/**
 * Button looks of the "journal" design. Primary = the accent pill (one per screen area); secondary =
 * an ink outline; quiet = text only. All keep a 44px touch target.
 */
export const buttonClass = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-[15px] font-semibold text-accent-ink transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink px-5 text-[15px] font-semibold text-ink transition-colors hover:bg-surface-sunk disabled:cursor-not-allowed disabled:opacity-50",
  quiet:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-[15px] font-semibold text-accent-strong transition-colors hover:bg-surface-sunk disabled:cursor-not-allowed disabled:opacity-50",
} as const;

/** A boxed item ("encadré"): thin rule, paper surface, almost square corners. */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-3xl border border-line bg-surface p-5 sm:p-6 ${className}`} {...props} />;
}

/** Rubric above a title, in small mono capitals. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`kicker text-accent-strong ${className}`}>{children}</p>;
}

/** Page title as a newspaper headline, closed by a rule. `aside` sits on the right on wide screens. */
export function PageHeader({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-ink pb-6 md:flex-row md:items-end md:justify-between md:gap-8">
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
        <h1 className="sd-display text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02] text-balance">{title}</h1>
        {children && (
          <div className="mt-3 max-w-[68ch] font-serif text-lg leading-relaxed text-ink-soft">{children}</div>
        )}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </header>
  );
}

/** Section heading in italic serif over a thin rule. */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2">
      <h2 className="font-serif text-2xl font-bold tracking-tight italic">{children}</h2>
      {action}
    </div>
  );
}

/**
 * Two newspaper columns on wide screens (main story + side column, split by a rule), stacked on
 * phones. Use it instead of narrowing a page: every page keeps the edges of the masthead.
 */
export function Columns({
  main,
  aside,
  className = "",
}: {
  main: ReactNode;
  aside: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] ${className}`}>
      <div className="min-w-0 lg:pr-10 2xl:pr-14">{main}</div>
      <aside className="min-w-0 lg:border-l lg:border-line lg:pl-10 2xl:pl-14">{aside}</aside>
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  className = "",
  barClassName = "bg-accent",
}: {
  /** In [0, 1]. */
  value: number;
  label: string;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-surface-sunk ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${barClassName}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function LanguageTag({ language, native = false }: { language: Language; native?: boolean }) {
  const style = languageStyle(language);
  const info = languageInfo(language);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.softBg} ${style.text}`}
    >
      <span className={`size-1.5 rounded-full ${style.bg}`} aria-hidden="true" />
      {native ? info.nativeName : info.nameFr}
    </span>
  );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-ink-soft ${className}`}
    >
      {children}
    </span>
  );
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <p className="mb-6 border-y border-dashed border-line py-2.5 text-xs leading-relaxed text-muted">{children}</p>
  );
}
