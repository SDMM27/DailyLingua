/** Illustrative spaced-repetition intervals: a card travels along the timeline (only without reduced motion). */
const STEPS = [
  { label: "J+1", at: 0 },
  { label: "J+3", at: 25 },
  { label: "J+7", at: 50 },
  { label: "J+16", at: 75 },
  { label: "J+35", at: 100 },
];

const css = `
@keyframes landing-travel {
  0%, 8% { left: 0%; }
  20%, 28% { left: 25%; }
  40%, 48% { left: 50%; }
  60%, 68% { left: 75%; }
  80%, 100% { left: 100%; }
}
@media (prefers-reduced-motion: no-preference) {
  .landing-travel { animation: landing-travel 9s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
}
`;

export function SrsTimeline() {
  return (
    <div className="relative mx-[4.75rem] h-28">
      <style>{css}</style>
      <div aria-hidden="true" className="absolute inset-x-0 top-[72px] h-0.5 bg-line" />
      <ol className="contents">
        {STEPS.map((step) => (
          <li
            key={step.label}
            className="absolute top-16 flex -translate-x-1/2 flex-col items-center gap-2"
            style={{ left: `${step.at}%` }}
          >
            <span className="size-4 rounded-full border-[3px] border-accent bg-paper" aria-hidden="true" />
            <span className="font-mono text-xs font-bold">{step.label}</span>
          </li>
        ))}
      </ol>
      <div
        aria-hidden="true"
        className="landing-travel absolute top-0 left-1/2 -translate-x-1/2 rounded-xl bg-accent px-3 py-2 whitespace-nowrap text-accent-ink"
      >
        <span lang="it" className="font-serif text-[15px] font-bold italic sm:text-[17px]">
          il bancone
        </span>
        <span className="text-xs sm:text-[13px]"> · le comptoir</span>
      </div>
    </div>
  );
}
