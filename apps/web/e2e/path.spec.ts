import { expect, test } from "@playwright/test";
import { collectErrors, deleteTestUser, expectNoHorizontalOverflow, requireLocalSupabase, signUpAndInstall, uniqueEmail } from "./helpers";

/** The path map on an iPhone-sized screen: the tab, the line, the unit sheet and « Je connais déjà ». Needs the local Supabase stack. */
test.beforeAll(() => {
  requireLocalSupabase();
});

test.describe("path map", () => {
  const email = uniqueEmail("path");

  test.afterAll(async () => {
    await deleteTestUser(email);
  });

  test("the « Parcours » tab opens the line; a station opens its sheet; the test link opens the test, at 390 px", async ({ page }) => {
    const { errors } = collectErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await signUpAndInstall(page, email);

    const tabs = page.getByRole("navigation", { name: "Navigation" });
    await expect(tabs.getByRole("link")).toHaveCount(4);
    await tabs.getByRole("link", { name: "Parcours" }).click();
    await expect(page).toHaveURL(/\/parcours\/it$/);
    await expect(page.getByRole("heading", { level: 1, name: /Niveau A\d/ })).toBeVisible();
    await expect(page.getByText(/0 unité sur \d+\./)).toBeVisible();
    await expect(tabs.getByRole("link", { name: "Parcours" })).toHaveAttribute("aria-current", "page");
    await expectNoHorizontalOverflow(page);

    // The first unit is the current station, opened by its title; every unit opens (no lock).
    await page.getByRole("button", { name: /Saluer et se présenter/ }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("À la fin, tu pourras dire")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await sheet.getByRole("link", { name: /Je connais déjà/ }).click();
    await expect(page).toHaveURL(/\/parcours\/it\/it-a1-01-saluer\?start=test$/);
    await expect(page.getByText(/Question 1 sur 10/)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("Today leads to the map with a secondary link", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("e2e-password-123");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("link", { name: "Voir le parcours" }).click();
    await expect(page).toHaveURL(/\/parcours\/it$/);
  });
});
