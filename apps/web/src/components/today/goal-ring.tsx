import { useFormatter, useTranslations } from "next-intl";

const RADIUS = 37;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Daily goal ring: four registration marks around an arc that fills with the XP earned today. */
export function GoalRing({ current, target }: { current: number; target: number }) {
  const t = useTranslations("today.goal");
  const format = useFormatter();
  const ratio = target > 0 ? Math.min(1, current / target) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuenow={current}
      aria-label={t("ariaLabel", { current, target })}
      className="relative size-24 shrink-0"
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90 rtl:rotate-90" aria-hidden="true">
        <path d="M50 1v12M50 87v12M1 50h12M87 50h12" className="stroke-muted" strokeWidth="2" fill="none" />
        <circle cx="50" cy="50" r={RADIUS} className="stroke-line" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          className="stroke-accent"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
          opacity={ratio > 0 ? 1 : 0}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
        <span className="text-xs font-semibold leading-tight">
          {t("progress", { current: format.number(current), target: format.number(target) })}
        </span>
      </div>
    </div>
  );
}
