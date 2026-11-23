"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, type ReactNode } from "react";

/** What the unit page knows about the learner beyond the unit and its progress (the path map, the warm-up, the XP). */
export interface UnitExtras {
  /** Opens the path map (« Retour au parcours »); null without one. */
  openPath: (() => void) | null;
  /** The unit's station number on the map (rank among the visible units); null outside the unit page. */
  number: number | null;
  /** « Je connais déjà »: open straight on the test. */
  startAtTest: boolean;
  /** XP earned in this unit before this visit (server, `focus.*` lines of its attempts). */
  unitXp: number;
  /** Missed sentences of the last failed test to redo first; empty when there is no warm-up. */
  warmupItemIds: string[];
}

const NONE: UnitExtras = { openPath: null, number: null, startAtTest: false, unitXp: 0, warmupItemIds: [] };
const UnitExtrasContext = createContext<UnitExtras>(NONE);

export function UnitExtrasProvider({ value, children }: { value: Omit<UnitExtras, "openPath"> & { pathHref: string }; children: ReactNode }) {
  const router = useRouter();
  const { pathHref, number, startAtTest, unitXp, warmupItemIds } = value;
  const extras = useMemo(() => ({ openPath: () => router.push(pathHref), number, startAtTest, unitXp, warmupItemIds }), [router, pathHref, number, startAtTest, unitXp, warmupItemIds]);
  return <UnitExtrasContext value={extras}>{children}</UnitExtrasContext>;
}

export function useUnitExtras(): UnitExtras {
  return useContext(UnitExtrasContext);
}
