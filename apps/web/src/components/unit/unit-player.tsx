"use client";

import type { AccentTolerance } from "@dailylingua/core";
import type { Unit } from "@dailylingua/schemas";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEventSync } from "@/components/pwa/event-sync-provider";
import type { UnitEvent } from "@/lib/units/events";
import { useOnlineStatus } from "@/lib/offline/online-status";
import type { UnitProgressView } from "@/lib/units/progress";
import { UnitFlow } from "./unit-flow";

/** The unit screens wired to the app: the offline event queue, the router and the connection state. */
export function UnitPlayer({ unit, progress, tolerance, xpVisible, animate, nextUnit, backHref }: {
  unit: Unit;
  progress: UnitProgressView | null;
  tolerance: AccentTolerance;
  xpVisible: boolean;
  animate: boolean;
  nextUnit: { id: string; title: string } | null;
  backHref: string;
}) {
  const sync = useEventSync();
  const router = useRouter();
  const online = useOnlineStatus();
  // The explanations exist in French and English; any other interface language reads English.
  const locale = useLocale() === "fr" ? "fr" : "en";

  async function onEvents(events: UnitEvent[]) {
    if (!sync) throw new Error("No offline queue on this device");
    await sync.enqueueUnitEvents(events);
  }

  function leave() {
    if (online) void sync?.flushNow().catch(() => undefined);
    router.push(backHref);
  }

  return (
    <UnitFlow
      unit={unit}
      progress={progress}
      locale={locale}
      tolerance={tolerance}
      xpVisible={xpVisible}
      animate={animate}
      offline={!online}
      nextUnit={nextUnit}
      onEvents={onEvents}
      onLeave={leave}
      onOpenUnit={(id) => router.push(`/parcours/${unit.language}/${id}`)}
    />
  );
}
