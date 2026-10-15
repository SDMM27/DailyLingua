import { expect, test } from "@playwright/test";
import { DEMO_EMAIL, requireLocalSupabase } from "./helpers";

test.beforeAll(() => {
  requireLocalSupabase();
});

test("a visitor without account is sent to the sign-in screen", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/connexion$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the install tutorial is reachable without an account", async ({ page }) => {
  await page.goto("/installer");
  await expect(page).toHaveURL(/\/installer$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("écran d’accueil");
});

test("a wrong password shows an error", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe").fill("not-the-password");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/connexion$/);
});
