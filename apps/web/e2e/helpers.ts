import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

export const TEST_PASSWORD = "e2e-password-123";

/**
 * The tests create and delete accounts: they only run against the local Supabase stack
 * (`npx supabase start`, then `npx supabase db reset`; the variables come from
 * `npx supabase status -o env`), never against a real project.
 */
export function requireLocalSupabase(): { url: string; serviceRoleKey: string | undefined } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not set: the e2e tests need the local Supabase stack " +
        "(npx supabase start, npx supabase db reset, variables from `npx supabase status -o env`).",
    );
  }
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  }
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`The e2e tests refuse to run against ${host}: only the local Supabase stack (127.0.0.1 or localhost) is allowed.`);
  }
  return { url, serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

/** A throw-away address, unique per run. */
export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@dailylingua.test`;
}

/**
 * Deletes a test account (its profile, enrollments and estimates cascade). Test infrastructure only:
 * the service role never reaches the app. Without the key the account is left in the local database.
 */
export async function deleteTestUser(email: string): Promise<void> {
  const { url, serviceRoleKey } = requireLocalSupabase();
  if (!serviceRoleKey) return;
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user = data?.users.find((candidate) => candidate.email === email);
  if (user) await admin.auth.admin.deleteUser(user.id);
}

/** Collects console errors and uncaught page exceptions; assert on `.errors` at the end of a test. */
export function collectErrors(page: Page, isOffline = () => false) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const url = message.location().url;
    // WebKit reports these failed requests as internal errors during the intentional offline phase.
    if (isOffline() && message.text() === "Failed to load resource: WebKit encountered an internal error"
      && ["/manifest.webmanifest", "/api/events"].some((path) => url === new URL(path, page.url()).href)) return;
    errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    // WebKit reports a link prefetch (`?_rsc=`) cancelled by a full page load (page.goto) this way.
    if (error.message.includes("_rsc=") && error.message.includes("access control checks")) return;
    // Same for the service worker registration, started on the first page and interrupted when the
    // test navigates away at once; the next page registers it again.
    if (error.message.includes("serwist/sw.js") && /load failed|access control checks/i.test(error.message)) return;
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

/**
 * The screen has no WCAG 2.0/2.1 A or AA violation by axe (`axe-core` is injected in the page: no network, no extra
 * test dependency). Colour contrast is included; run it in light and in dark.
 */
export async function expectNoAxeViolations(page: Page) {
  // A sheet that is still fading in has text at half opacity, which no contrast rule can judge: wait for the finite animations.
  // After a client-side navigation the streamed <title> lands a moment later: wait for it, or `document-title` flickers.
  await page.waitForFunction(() => document.title.trim() !== "");
  await page.evaluate(() => Promise.all(document.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished)));
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run(context: Document, options: object): Promise<{ violations: { id: string; nodes: { target: unknown[] }[] }[] }> } }).axe;
    const result = await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] });
    return result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`);
  });
  expect(violations).toEqual([]);
}

/** Taps a choice the way a user does: its visible row (the radio itself is visually hidden). */
async function choose(page: Page, name: string | RegExp) {
  await page.locator("label").filter({ has: page.getByRole("radio", { name }) }).click();
}

/** Creates an account through the interface and completes the installation (Italian, 15 minutes) at the given starting level. */
async function signUpAndCompleteInstallation(page: Page, email: string, level: RegExp, knownLanguage?: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  await page.getByRole("button", { name: "Continuer" }).click();
  await choose(page, /italien/);
  if (knownLanguage) {
    await page.getByText("Autres langues que tu connais (facultatif)", { exact: true }).click();
    await page.getByRole("searchbox", { name: "Rechercher une langue" }).fill(knownLanguage);
    await page.getByRole("checkbox", { name: knownLanguage, exact: true }).check();
  }
  await page.getByRole("button", { name: "Continuer" }).click();
  await choose(page, level);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Commencer" }).click();
}

/** Creates an account through the interface and completes the installation (Italian, A0, 15 minutes); ends on Today, in French. */
export async function signUpAndInstall(page: Page, email: string, knownLanguage?: string) {
  await signUpAndCompleteInstallation(page, email, /Je débute/, knownLanguage);
  await expect(page).toHaveURL(/\/$/);
}

/** The same installation at A1, where a learner already knows some Italian: ends on the offer of the placement test. */
export async function signUpAndInstallToPlacementOffer(page: Page, email: string, knownLanguage?: string) {
  await signUpAndCompleteInstallation(page, email, /Je comprends l’essentiel du quotidien/, knownLanguage);
  await expect(page).toHaveURL(/\/placement\/it\/bienvenue$/);
}
