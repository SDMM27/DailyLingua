import type { CSSProperties, ReactNode } from "react";

/** Width of the content: one column on a phone, the rail and the panel from 900 px. */
const COLUMN = "mx-auto w-full max-w-[1000px] px-5";

/**
 * The frame of the placement screens: a header (close button, steps), a scrolling zone and a footer clear of the home
 * indicator. Full screen, without the tab bar (`data-unit`, as the unit player). `narrow` keeps a screen to one
 * centred column on a wide screen (entry, result). The accent of the language comes from `style` (`languageStyle`).
 */
export function PlacementShell({ style, header, footer, narrow = false, centered = false, children }: {
  style?: CSSProperties;
  header?: ReactNode;
  footer?: ReactNode;
  narrow?: boolean;
  centered?: boolean;
  children: ReactNode;
}) {
  const width = narrow ? "mx-auto w-full max-w-[640px] px-5" : COLUMN;
  return (
    <section data-unit style={style} className="fixed inset-0 z-20 flex flex-col bg-bg text-ink">
      <header className={`${width} flex items-center gap-3 pt-[env(safe-area-inset-top)]`}>{header}</header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={`${width} flex min-h-full flex-col pb-6 ${centered ? "justify-center" : ""}`}>{children}</div>
      </div>
      {footer && (
        <footer className="border-t border-line bg-bg pb-[calc(0.75rem+env(safe-area-inset-bottom))] min-[900px]:pb-6">
          <div className={`${width} pt-3`}>{footer}</div>
        </footer>
      )}
    </section>
  );
}
