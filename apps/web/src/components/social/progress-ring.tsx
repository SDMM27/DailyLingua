const RADIUS = 96;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Big ring of a shared goal: the arc fills with the share reached; the figures are written in the middle. */
export function ProgressRing({ total, goal, caption, label }: { total: number; goal: number; caption: string; label: string }) {
  const ratio = goal > 0 ? Math.min(1, total / goal) : 0;
  return (
    <div role="img" aria-label={label} className="relative mx-auto size-56">
      <svg viewBox="0 0 220 220" className="size-full -rotate-90 rtl:rotate-90" aria-hidden="true">
        <circle cx="110" cy="110" r={RADIUS} className="stroke-accent-soft" strokeWidth="14" fill="none" />
        <circle cx="110" cy="110" r={RADIUS} className="stroke-accent" strokeWidth="14" strokeLinecap="round" fill="none"
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - ratio)} opacity={ratio > 0 ? 1 : 0} />
      </svg>
      <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="sd-display text-5xl">{total}</span>
        <span className="text-sm text-muted">{caption}</span>
      </div>
    </div>
  );
}
