import { defineConfig, devices } from "@playwright/test";

// 3200 by default (not 3000 or 3100, so that the legacy app and its tests can run alongside);
// E2E_PORT moves it when 3200 is taken.
const PORT = Number(process.env.E2E_PORT ?? 3200);
const EXPRESSION_AI_PORT = Number(process.env.E2E_EXPRESSION_AI_PORT ?? 0);

export default defineConfig({
  testDir: "./e2e",
  // One shared local database: tests run one after the other.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    // The app targets Safari on iPhone. A French browser: the interface starts in French.
    ...devices["iPhone 13"],
    locale: "fr-FR",
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "iphone-webkit" }],
  webServer: {
    command: `npm run build${process.env.E2E_WEBPACK === "1" ? " -- --webpack" : ""} && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/sign-in`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      // No CAPTCHA: a real Turnstile site key cannot be solved by the test browser and would keep
      // the sign-in buttons disabled. Empty wins over any value in the environment.
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
      GRADED_TEXT_GENERATION: "off",
      EXPRESSION_AI: EXPRESSION_AI_PORT ? "on" : "off",
      ...(EXPRESSION_AI_PORT ? {
        ANTHROPIC_API_KEY: "local-test-key",
        ANTHROPIC_API_KEY_FALLBACK: "",
        ANTHROPIC_BASE_URL: `http://127.0.0.1:${EXPRESSION_AI_PORT}`,
      } : {}),
    },
  },
});
