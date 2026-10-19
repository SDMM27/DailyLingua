import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { Eyebrow } from "@/components/ui/primitives";
import { GUEST_TRIAL_DAYS, type GuestTrialStatus } from "@/lib/domain/guest-trial";

/**
 * Reminds a guest where they are in the trial and why to create an account.
 * `startedToday`: today's mission exists, so today is already counted in `daysUsed`.
 */
export function GuestTrialBanner({ trial, startedToday }: { trial: GuestTrialStatus; startedToday: boolean }) {
  const over = !trial.canStartToday;
  const day = Math.min(GUEST_TRIAL_DAYS, trial.daysUsed + (startedToday ? 0 : 1));
  const title = over
    ? "Essai terminé"
    : day >= GUEST_TRIAL_DAYS
      ? "Essai sans compte : dernier jour"
      : `Essai sans compte : jour ${day} sur ${GUEST_TRIAL_DAYS}`;
  return (
    <Link
      href="/creer-mon-compte"
      className="flex items-center gap-3 rounded-3xl border border-line bg-surface-sunk px-5 py-4 transition-colors hover:bg-surface"
    >
      <span className="min-w-0 flex-1">
        <Eyebrow>{title}</Eyebrow>
        <span className="mt-1 block font-semibold">Crée ton compte pour continuer</span>
        <span className="text-xs text-muted">
          Garde ta progression, personnalise tes missions et retrouve-les sur un autre appareil.
        </span>
      </span>
      <ArrowRightIcon width={16} height={16} className="text-muted" />
    </Link>
  );
}
