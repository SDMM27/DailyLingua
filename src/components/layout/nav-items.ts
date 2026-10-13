import type { ComponentType, SVGProps } from "react";
import { BookIcon, CardsIcon, SlidersIcon, SunIcon } from "@/components/icons";

export interface NavItem {
  href: "/" | "/mission" | "/vocabulaire" | "/preferences";
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Aujourd'hui", icon: SunIcon },
  { href: "/mission", label: "Mission", icon: BookIcon },
  { href: "/vocabulaire", label: "Mots", icon: CardsIcon },
  { href: "/preferences", label: "Réglages", icon: SlidersIcon },
];

/** Screens shown before the app proper (sign-in, first run): no navigation. */
export function hidesNavigation(pathname: string): boolean {
  return pathname === "/connexion" || pathname === "/bienvenue";
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
