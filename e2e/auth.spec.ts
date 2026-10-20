import { expect, test } from "@playwright/test";
import { DEMO_EMAIL, appAlert, expectNoHorizontalOverflow, requireLocalSupabase } from "./helpers";

test.beforeAll(() => {
  requireLocalSupabase();
});

test("a visitor without account sees the teaser on the home page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/decouvrir$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Essayer sans compte" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("a visitor without account is sent to the sign-in screen from any other page", async ({ page }) => {
  await page.goto("/mission");
  await expect(page).toHaveURL(/\/connexion$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the install tutorial is reachable without an account", async ({ page }) => {
  await page.goto("/installer");
  await expect(page).toHaveURL(/\/installer$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("écran d’accueil");
});

test("the privacy policy is reachable without an account", async ({ page }) => {
  await page.goto("/confidentialite");
  await expect(page).toHaveURL(/\/confidentialite$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Politique de confidentialité");
  await expectNoHorizontalOverflow(page);
});

test("a wrong password shows an error", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe").fill("not-the-password");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(appAlert(page)).toBeVisible();
  await expect(page).toHaveURL(/\/connexion$/);
});
