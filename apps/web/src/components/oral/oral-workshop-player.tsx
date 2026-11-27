"use client";

import type { AccentTolerance } from "@dailylingua/core";
import { useRouter } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { useEventSync } from "@/components/pwa/event-sync-provider";
import { useOnlineStatus } from "@/lib/offline/online-status";
import type { OralPacket } from "@/lib/oral/select-oral";
import type { UnitEvent } from "@/lib/units/events";
import { OralWorkshop } from "./oral-workshop";

/** « À voix haute » wired to the app: the offline event queue, the router and the connection state. */
export function OralWorkshopPlayer({ packet, languageName, units, locale, tolerance, xpVisible, backHref, roleplayCard }: {
  packet: OralPacket;
  languageName: string;
  units: string[];
  locale: "fr" | "en";
  tolerance: AccentTolerance;
  xpVisible: boolean;
  backHref: string;
  roleplayCard?: ReactNode;
}) {
  const sync = useEventSync();
  const router = useRouter();
  const online = useOnlineStatus();

  async function onEvents(events: UnitEvent[]) {
    if (!sync) throw new Error("No offline queue on this device");
    await sync.enqueueUnitEvents(events);
  }

  // Delivered when the queue is empty after a delivery attempt (a refused event leaves the queue too).
  const checkDelivery = useCallback(async () => {
    if (!sync) return false;
    await sync.flushNow();
    return (await sync.queueSize()) === 0;
  }, [sync]);

  function leave() {
    if (online) void sync?.flushNow().catch(() => undefined);
    router.push(backHref);
  }

  return (
    <OralWorkshop
      packet={packet}
      languageName={languageName}
      units={units}
      locale={locale}
      tolerance={tolerance}
      xpVisible={xpVisible}
      offline={!online}
      onEvents={onEvents}
      checkDelivery={checkDelivery}
      onLeave={leave}
      roleplayCard={roleplayCard}
    />
  );
}
