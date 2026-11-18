import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { THEME_COLOR_LIGHT } from "@/lib/pwa";

/** The installable app, named and described in the language of the request (cookie, then Accept-Language). */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("common");
  return {
    id: "/",
    name: t("appName"),
    short_name: t("appName"),
    description: t("appDescription"),
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLOR_LIGHT,
    theme_color: THEME_COLOR_LIGHT,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
