import { expect, test, type Page } from "@playwright/test";
import { collectErrors, deleteTestUser, expectNoHorizontalOverflow, requireLocalSupabase, signUpAndInstall, uniqueEmail } from "./helpers";

test.beforeAll(() => {
  requireLocalSupabase();
});

/** What WebKit logs for a request that fails because the test cut the network: expected, not an app error. */
const OFFLINE_NOISE = /Failed to load resource|Load failed|network connection was lost|offline/i;

/** Waits until the service worker is installed (the precache is filled) and controls the page. */
async function waitForServiceWorker(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 15_000 }).toBe(true);
}

/** The URLs (path only) held by every HTTP cache of the origin. */
async function cachedPaths(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) paths.push(new URL(request.url).pathname);
    }
    return paths;
  });
}

test("the app is installable: manifest, icons and mobile metadata", async ({ page, request }) => {
  await page.goto("/sign-in");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
  await expect(page.locator('meta[name="mobile-web-app-capable"], meta[name="apple-mobile-web-app-capable"]').first()).toHaveAttribute("content", "yes");

  const response = await request.get("/manifest.webmanifest", { headers: { "Accept-Language": "fr-FR" } });
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({ name: "Daily Lingua", display: "standalone", start_url: "/" });
  expect(manifest.description).toContain("séance");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok(), icon.src).toBe(true);

  // The microphone is allowed for this origin only.
  expect(response.headers()["permissions-policy"]).toContain("microphone=(self)");
});

test("the offline page is served when the network is down, after a first visit", async ({ page, context }) => {
  const { errors } = collectErrors(page);
  await page.goto("/sign-in");
  await waitForServiceWorker(page);

  // The page itself is public and translated.
  await page.goto("/offline");
  await expect(page.getByRole("heading", { level: 1, name: "Pas de connexion" })).toBeVisible();

  await context.setOffline(true);
  await page.goto("/sign-up");
  await expect(page.getByRole("heading", { level: 1, name: "Pas de connexion" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 740 });
  await expectNoHorizontalOverflow(page);

  // Back online, the same address loads the real page.
  await context.setOffline(false);
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Créer ton compte" })).toBeVisible();
  expect(errors.filter((error) => !OFFLINE_NOISE.test(error))).toEqual([]);
});

test.describe("lab", () => {
  const email = uniqueEmail("lab");

  test.afterAll(async () => {
    await deleteTestUser(email);
  });

  test("a signed-out visitor is sent to the sign-in screen, also for the push route", async ({ page, request }) => {
    await page.goto("/lab");
    await expect(page).toHaveURL(/\/sign-in$/);
    const response = await request.post("/lab/push-test", { data: {}, maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toContain("/sign-in");
  });

  test("shows six folded cards without overflow, caches no user data, and sends the queue when the network returns", async ({
    page,
    context,
  }) => {
    const { errors } = collectErrors(page);
    await page.setViewportSize({ width: 360, height: 740 });
    await signUpAndInstall(page, email);

    // The link in the settings is discreet but there.
    await page.getByRole("link", { name: "Réglages" }).click();
    await page.getByRole("link", { name: /Outils de test/ }).click();
    await expect(page).toHaveURL(/\/lab$/);
    await expect(page.getByRole("heading", { level: 1, name: "Outils de test" })).toBeVisible();

    const cards = page.locator("details");
    await expect(cards).toHaveCount(6);
    for (const card of await cards.all()) await expect(card).not.toHaveAttribute("open", "");
    await expectNoHorizontalOverflow(page);

    // Every card has its title; open them all: still no sideways scroll, targets of 44 px at least.
    for (const title of ["Installation et stockage", "Micro", "Voix de synthèse", "Reconnaissance vocale", "Notifications", "Mode hors ligne"]) {
      await expect(page.locator("summary").filter({ hasText: title })).toBeVisible();
    }
    for (const summary of await page.locator("summary").all()) await summary.click();
    await expectNoHorizontalOverflow(page);
    for (const button of await page.locator("details button:visible").all()) {
      expect((await button.boundingBox())?.height ?? 0, await button.innerText()).toBeGreaterThanOrEqual(44);
    }

    // Environment card: not installed in a test browser, and says so.
    await page.getByRole("button", { name: "Vérifier" }).click();
    await expect(page.locator("pre").filter({ hasText: "Lancée depuis l’écran d’accueil: non" })).toBeVisible();

    // Offline queue: online, three events leave at once.
    const queueCard = page.locator("details").filter({ hasText: "Mode hors ligne" });
    await queueCard.getByRole("button", { name: "Mettre 3 événements en file" }).click();
    await expect(queueCard.locator("pre")).toContainText("3 événements envoyés");
    await expect(queueCard.locator("pre")).toContainText("Événements en attente: 0");

    // Offline: they stay in the queue (and in IndexedDB)...
    await context.setOffline(true);
    await expect(queueCard.locator("pre")).toContainText("Réseau: hors ligne");
    await queueCard.getByRole("button", { name: "Mettre 3 événements en file" }).click();
    await expect(queueCard.locator("pre")).toContainText("Événements en attente: 3");
    await expect(queueCard.locator("pre")).toContainText("échec, prochaine tentative");

    // ... and leave by themselves when the network returns.
    await context.setOffline(false);
    await expect(queueCard.locator("pre")).toContainText("Événements en attente: 0", { timeout: 15_000 });
    await expect(queueCard.locator("pre")).toContainText("Réseau: en ligne");

    // The service worker never stored a page or any data of the signed-in learner.
    await waitForServiceWorker(page);
    const paths = await cachedPaths(page);
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path.startsWith("/_next/static/") || path.startsWith("/icons/") || path === "/offline", path).toBe(true);
    }

    expect(errors.filter((error) => !OFFLINE_NOISE.test(error))).toEqual([]);
  });

  test("the push route does nothing without the VAPID keys", async ({ page }) => {
    const pushEmail = uniqueEmail("push");
    try {
      await signUpAndInstall(page, pushEmail);
      const post = (data: unknown) => page.request.post("/lab/push-test", { data });
      // No VAPID key in the test environment: nothing is sent, whatever the body.
      expect((await post({ subscription: { endpoint: "https://web.push.apple.com/x", keys: { p256dh: "a", auth: "b" } } })).status()).toBe(503);
      expect((await page.request.get("/lab/push-test")).status()).toBe(405);
    } finally {
      await deleteTestUser(pushEmail);
    }
  });
});
