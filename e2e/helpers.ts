import { expect, type Page } from "@playwright/test";

export const DEMO_EMAIL = "demo@dailylingua.test";
export const DEMO_PASSWORD = "demo-password-123";

/**
 * The tests create and delete accounts: they only run against the local Supabase stack
 * (`npm run db:start` then `npm run db:reset`), never against a real project.
 */
export function requireLocalSupabase(): { url: string; serviceRoleKey: string | undefined } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL n'est pas défini : les tests E2E demandent la base Supabase locale " +
        "(npm run db:start, npm run db:reset, variables dans .env.local).",
    );
  }
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL n'est pas une URL valide.");
  }
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(
      `Les tests E2E refusent de tourner contre ${host} : seule la base Supabase locale (127.0.0.1 ou localhost) est autorisée.`,
    );
  }
  return { url, serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

/** Signs in through the form and waits for the dashboard. */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/$/);
}

/** Collects console errors and uncaught page exceptions; assert on `.errors` at the end of a test. */
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    // WebKit reports a link prefetch (`?_rsc=`) cancelled by a full page load (page.goto) this way.
    if (error.message.includes("_rsc=") && error.message.includes("access control checks")) return;
    errors.push(`pageerror: ${error.message}`);
  });
  return { errors };
}

/** The page must not scroll sideways (it would on a phone if something overflows). */
export async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, `scrollWidth ${scrollWidth} > innerWidth ${innerWidth}`).toBeLessThanOrEqual(innerWidth);
}
