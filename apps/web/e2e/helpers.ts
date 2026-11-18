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
