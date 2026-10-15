import { expect, test } from "@playwright/test";
import { DEMO_EMAIL, appAlert, requireLocalSupabase } from "./helpers";

test.beforeAll(() => {
  requireLocalSupabase();
});

test("the sign-in screen links to the password reset", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
  await expect(page).toHaveURL(/\/mot-de-passe-oublie$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Mot de passe oublié");
});

test("the reset answer is the same for an unknown address and for an existing account", async ({ page }) => {
  const notices: string[] = [];
  for (const email of [`inconnu-${Date.now()}@example.com`, DEMO_EMAIL]) {
    await page.goto("/mot-de-passe-oublie");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByRole("button", { name: "Envoyer le lien" }).click();
    const notice = page.getByText("Si un compte existe pour cette adresse");
    await expect(notice).toBeVisible();
    notices.push((await notice.textContent()) ?? "");
  }
  expect(notices[0]).toBe(notices[1]);
});

test("an expired reset link explains what to do", async ({ page }) => {
  await page.goto("/mot-de-passe-oublie?lien=invalide");
  await expect(appAlert(page)).toContainText("Ce lien a expiré ou a déjà servi");
});

test("the new password page needs a session", async ({ page }) => {
  await page.goto("/nouveau-mot-de-passe");
  await expect(page).toHaveURL(/\/connexion$/);
});
