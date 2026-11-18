import { defineConfig, devices } from "@playwright/test";

const PORT = 3200; // not 3000 or 3100, so that the legacy app and its tests can run alongside

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
    command: "npm run build && npm run start",
    url: `http://localhost:${PORT}/sign-in`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      // No CAPTCHA: a real Turnstile site key cannot be solved by the test browser and would keep
      // the sign-in buttons disabled. Empty wins over any value in the environment.
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
    },
  },
});
