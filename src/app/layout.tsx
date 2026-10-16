import type { Metadata, Viewport } from "next";
import { Inter, Literata } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { TabBar } from "@/components/layout/tab-bar";
import { TopBar } from "@/components/layout/top-bar";
import "./globals.css";

// Fonts need Cyrillic for Russian. "latin" already covers the accents of Italian,
// Spanish, Portuguese and German, so "latin-ext" isn't needed. Each subset is a
// separate preloaded file, so keep this list short: it weighs on mobile load time.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "cyrillic"],
});

// Italic is only used for example sentences: not preloaded, fetched when a page shows it.
const literataItalic = Literata({
  variable: "--font-literata-italic",
  subsets: ["latin", "cyrillic"],
  style: "italic",
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "Daily Lingua", template: "%s · Daily Lingua" },
  description: "Une mission quotidienne de russe et d'italien à partir de contenus authentiques.",
  applicationName: "Daily Lingua",
  // Home-screen web app on iOS: full screen, no Safari chrome.
  appleWebApp: { capable: true, title: "Lingua", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#141311" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${literata.variable} ${literataItalic.variable} antialiased`}>
      <body className="min-h-dvh">
        <TopBar />
        {/* Bottom padding keeps content clear of the fixed tab bar + home indicator. */}
        <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:pt-10 md:pb-16">
          {children}
        </main>
        <TabBar />
        {/* The script is served by Vercel only: elsewhere (local build, CI) it is a 404 in the console. */}
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  );
}
