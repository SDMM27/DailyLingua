import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Literata, Newsreader } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Masthead } from "@/components/layout/masthead";
import { TabBar } from "@/components/layout/tab-bar";
import { THEME_COLORS, themeBootScript } from "@/components/layout/theme";
import "./globals.css";

// Each subset is a separate preloaded file, so keep these lists short: they weigh on mobile load time.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

// Titles, rubrics and example sentences (roman and italic, optical sizes up to 72).
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

// Newsreader has no Cyrillic: Literata draws Russian and Ukrainian in the serif stack. Fetched only
// when a page shows Cyrillic (unicode-range), so not preloaded.
const literata = Literata({
  variable: "--font-literata",
  subsets: ["cyrillic"],
  style: ["normal", "italic"],
  preload: false,
});

// Datelines and technical details only: not preloaded.
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "Daily Lingua", template: "%s · Daily Lingua" },
  description: "Une mission quotidienne de langues à partir de contenus authentiques.",
  applicationName: "Daily Lingua",
  // Home-screen web app on iOS: full screen, no Safari chrome.
  appleWebApp: { capable: true, title: "Lingua", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Light is the default; the theme toggle rewrites this tag when the reader switches to dark.
  themeColor: THEME_COLORS.light,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      data-theme="light"
      // The boot script may switch data-theme to the reader's saved choice before hydration.
      suppressHydrationWarning
      className={`${inter.variable} ${newsreader.variable} ${literata.variable} ${jetbrains.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh">
        <Masthead />
        {/* Bottom padding keeps content clear of the fixed tab bar + home indicator. */}
        <main className="page-x pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pt-10 md:pb-20">{children}</main>
        <TabBar />
        {/* The script is served by Vercel only: elsewhere (local build, CI) it is a 404 in the console. */}
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  );
}
