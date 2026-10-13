import type { HTMLAttributes, ReactNode } from "react";
import { languageInfo } from "@/lib/domain/languages";
import type { Language } from "@/lib/schemas/common";
import { languageStyle } from "./language-style";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-3xl border border-line bg-surface p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:p-6 ${className}`}
      {...props}
    />
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-semibold tracking-[0.14em] text-muted uppercase ${className}`}>
      {children}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-7">
      {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
      <h1 className="font-serif text-[2rem] leading-[1.1] font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h1>
      {children && <div className="mt-3 text-[15px] leading-relaxed text-ink-soft">{children}</div>}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="font-serif text-xl font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  className = "",
  barClassName = "bg-ink",
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
    <p className="mb-6 rounded-2xl border border-dashed border-line px-4 py-2.5 text-xs leading-relaxed text-muted">
      {children}
    </p>
  );
}
