import { expect, test } from "@playwright/test";
import { collectErrors, deleteTestUser, expectNoHorizontalOverflow, requireLocalSupabase, signUpAndInstall, uniqueEmail } from "./helpers";

/**
 * The unit player on an iPhone-sized screen. The units are published; the server may still run with
 * `UNIT_DRAFTS=show`, and it needs the local Supabase stack.
 */
test.beforeAll(() => {
  requireLocalSupabase();
});

test.describe("unit player", () => {
  const email = uniqueEmail("unit");

  test.afterAll(async () => {
    await deleteTestUser(email);
  });

  test("from Today to the dialogue, the word panel, the pause sheet and the test, at 390 px", async ({ page }) => {
    const { errors } = collectErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await signUpAndInstall(page, email);

    // Today: the way into the path, below the session of the day.
    await expect(page.getByRole("heading", { level: 2, name: "Saluer et se présenter" })).toBeVisible();
    await page.getByRole("link", { name: "Commencer le parcours" }).click();
    await expect(page).toHaveURL(/\/parcours\/it\/it-a1-01-saluer$/);
    await expect(page.getByRole("heading", { level: 1, name: "Saluer et se présenter" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    // The dialogue, one line at a time.
    await page.getByRole("button", { name: "Commencer l’unité" }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Étape 1 sur 6, Dialogue");
    await expect(page.getByRole("button", { name: "Écouter la réplique 1" })).toBeVisible();
    await page.getByRole("button", { name: "Ciao, mot nouveau" }).first().click();
    await expect(page.getByRole("region", { name: "Mot touché" })).toContainText("salut");
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Fermer" }).click();

    // The pause sheet keeps the place; leaving goes back to Today.
    await page.getByRole("button", { name: "Mettre l’unité en pause" }).click();
    await expect(page.getByRole("dialog", { name: "Unité en pause" })).toBeVisible();
    await page.getByRole("button", { name: "Continuer" }).click();

    // « Je connais déjà »: the test, 10 questions, no feedback between them.
    await page.goto("/parcours/it/it-a1-01-saluer");
    await page.getByRole("button", { name: /Je connais déjà/ }).click();
    await expect(page.getByText(/Question 1 sur 10/)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    expect(errors).toEqual([]);
  });

  test("another language or an unknown unit is a 404", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("e2e-password-123");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/$/);
    expect((await page.goto("/parcours/ru/ru-a1-01-saluer"))?.status()).toBe(404);
    expect((await page.goto("/parcours/it/it-a1-99-nope"))?.status()).toBe(404);
  });
});
