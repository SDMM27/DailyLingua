import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/primitives";

/**
 * Form page of the "journal" design: on wide screens the headline and standfirst on the left, the form
 * in its box on the right, split by a vertical rule; stacked on phones. `wide` gives the form more room
 * (onboarding). Used by sign-in, account, onboarding and feedback pages, so they keep the masthead edges.
 */
export function AuthLayout({
  eyebrow,
  title,
  children,
  form,
  wide = false,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  /** The standfirst under the headline. */
  children?: ReactNode;
  form: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`grid gap-8 md:gap-0 ${
        wide ? "md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" : "md:grid-cols-2"
      }`}
    >
      <header className="min-w-0 md:pr-10 lg:pr-14">
        <div className="md:sticky md:top-6">
          <Eyebrow className="mb-3">{eyebrow}</Eyebrow>
          <h1 className="sd-display text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] text-balance">{title}</h1>
          {children && (
            <p className="mt-4 max-w-[68ch] font-serif text-lg leading-relaxed text-ink-soft">{children}</p>
          )}
        </div>
      </header>
      <div className="min-w-0 md:border-l md:border-line md:pl-10 lg:pl-14">
        <div className={wide ? "" : "max-w-lg"}>{form}</div>
      </div>
    </div>
  );
}
