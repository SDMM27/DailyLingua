import { expect, test, type Page } from "@playwright/test";
import {
  TEST_PASSWORD,
  collectErrors,
  deleteTestUser,
  expectNoHorizontalOverflow,
  requireLocalSupabase,
  uniqueEmail,
} from "./helpers";

test.beforeAll(() => {
  requireLocalSupabase();
});

/** The screens a visitor can reach, checked at the narrowest phone width we support. */
test("a visitor is sent to the sign-in screen, which does not overflow at 360 px", async ({ page }) => {
  const { errors } = collectErrors(page);
  await page.setViewportSize({ width: 360, height: 740 });

  for (const path of ["/", "/welcome", "/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in$/);
  }
  await expect(page.getByRole("heading", { level: 1, name: "Connexion" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/sign-up");
  await expect(page.getByRole("heading", { level: 1, name: "Créer ton compte" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  expect(errors).toEqual([]);
});

test("a short password and a bad e-mail are refused with a message in the interface language", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Adresse e-mail").fill("pas-une-adresse");
  await page.getByLabel("Mot de passe").fill("court");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByText("Cette adresse e-mail n’a pas l’air valide.")).toBeVisible();

  await page.getByLabel("Adresse e-mail").fill("quelquun@dailylingua.test");
  await page.getByLabel("Mot de passe").fill("court");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByText("Le mot de passe doit contenir au moins 8 caractères.")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-up$/);
});

test("a wrong password is refused", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Adresse e-mail").fill("inconnu@dailylingua.test");
  await page.getByLabel("Mot de passe").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Adresse e-mail ou mot de passe incorrect." })).toBeVisible();
});

test.describe("account journey", () => {
  const email = uniqueEmail();

  test.afterAll(async () => {
    await deleteTestUser(email);
  });

  test("sign up, install, Today in French, switch to English, sign out and back in", async ({ page }) => {
    const { errors } = collectErrors(page);
    // The narrowest phone width we support: no screen of the journey may scroll sideways.
    await page.setViewportSize({ width: 360, height: 740 });

    // Sign up: no e-mail confirmation on the local stack, so the session starts at once.
    await page.goto("/sign-up");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    // A new account has no learning plan: Today sends it to the installation.
    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");

    // 1. Mother tongue: preselected from the browser language.
    await expect(page.getByRole("heading", { level: 1, name: "Ta langue maternelle" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "français", exact: true })).toBeChecked();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Continuer" }).click();

    // 2. Language to learn: the mother tongue is not offered.
    await expect(page.getByRole("heading", { level: 1, name: "La langue que tu apprends" })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^français/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continuer" })).toBeDisabled();
    await choose(page, /italien/);
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Continuer" }).click();

    // 3. Starting level.
    await expect(page.getByRole("heading", { level: 1, name: "Ton niveau de départ" })).toBeVisible();
    await choose(page, /Je débute/);
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Continuer" }).click();

    // 4. Time per day: 15 minutes preselected; going back keeps the answers.
    await expect(page.getByRole("heading", { level: 1, name: "Ton temps par jour" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "15 minutes par jour" })).toBeChecked();
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page.getByRole("radio", { name: /Je débute/ })).toBeChecked();
    await page.getByRole("button", { name: "Continuer" }).click();
    await choose(page, "20 minutes par jour");
    await page.getByRole("button", { name: "Commencer" }).click();

    // Today, first-day state.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "italien" })).toBeVisible();
    await expect(page.getByText("Niveau de départ : A0")).toBeVisible();
    await expect(page.getByRole("button", { name: "Les séances arrivent bientôt" })).toBeDisabled();
    await expect(page.getByRole("progressbar", { name: "Objectif du jour : 0 sur 100 XP" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expectNoHorizontalOverflow(page);

    // Settings: the interface language changes at once.
    await page.getByRole("link", { name: "Réglages" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { level: 1, name: "Réglages" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByLabel("Langue de l’interface").selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await expect(page.getByText("Settings saved.")).toBeVisible();

    // The choice is stored in the profile: Today follows.
    await page.getByRole("link", { name: "Today" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Italian" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // Sign out, then back in (the language is remembered by the cookie).
    await page.getByRole("link", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await signInAgain(page, email);
    await expect(page.getByRole("heading", { level: 1, name: "Italian" })).toBeVisible();

    expect(errors).toEqual([]);
  });
});

/** Taps a choice the way a user does: its visible row (the radio itself is visually hidden). */
async function choose(page: Page, name: string | RegExp) {
  await page.locator("label").filter({ has: page.getByRole("radio", { name }) }).click();
}

async function signInAgain(page: Page, email: string) {
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("the guest trial leads to the installation", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Essayer sans compte" }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole("heading", { level: 1, name: "Ta langue maternelle" })).toBeVisible();
});
