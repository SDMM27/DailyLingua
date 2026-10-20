import { defineConfig, devices } from "@playwright/test";

// Same convention as src/test/setup-env.ts: pick up the local Supabase keys from .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (CI provides the variables): e2e/helpers.ts refuses to run without them.
}

const PORT = 3100; // not 3000, so that `npm run dev` can run alongside

export default defineConfig({
  testDir: "./e2e",
  // One shared local database: tests run one after the other.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    // The app targets Safari on iPhone.
    { name: "iphone-webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/installer`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      // Never call the paid AI during end-to-end tests.
      MISSION_GENERATOR: "template",
      // No CAPTCHA: a real Turnstile site key from .env.local cannot be solved by the test browser
      // and would keep the sign-in buttons disabled. Empty wins over .env.local (set, not undefined).
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
    },
  },
});
