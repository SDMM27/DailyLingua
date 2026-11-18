import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";
import { OFFLINE_PATH } from "@/lib/pwa";

/**
 * Serves the service worker (`/serwist/sw.js`) and its source map, built with esbuild at build time.
 * What it pre-caches, and nothing else: the fingerprinted scripts, styles and fonts of the build
 * (the same for every visitor), the app icons, and the offline page. No page of the app, no user data.
 * The offline page has no fingerprint of its own: its revision changes with every build.
 */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/sw/sw.ts",
  // Native esbuild on every platform (the WebAssembly one is not a dependency).
  useNativeEsbuild: true,
  // A classic script, not a module: the widest support in Safari.
  esbuildOptions: { format: "iife" },
  // Fonts: only the Latin subsets next/font marks for preloading (`-s.p.`), the others are many and rare.
  globPatterns: [".next/static/**/*.{js,css}", ".next/static/media/*-s.p.*.woff2", "public/icons/*.png"],
  additionalPrecacheEntries: [{ url: OFFLINE_PATH, revision: randomUUID() }],
});
