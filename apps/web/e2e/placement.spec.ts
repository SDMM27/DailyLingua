import { expect, test } from "@playwright/test";
import { collectErrors, deleteTestUser, expectNoAxeViolations, expectNoHorizontalOverflow, requireLocalSupabase, signUpAndInstallToPlacementOffer, uniqueEmail } from "./helpers";

/** The placement test, from the offer after the installation to the path, on an iPhone-sized screen. Needs the local Supabase stack. */
test.beforeAll(() => {
  requireLocalSupabase();
});

test.describe("placement test", () => {
  const email = uniqueEmail("placement");

  test.afterAll(async () => {
    await deleteTestUser(email);
  });

  test("the offer after the installation leads to the test; stopping keeps nothing; finishing keeps the level and opens the path, at 390 px", async ({ page }) => {
    const { errors } = collectErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await signUpAndInstallToPlacementOffer(page, email);

    await expect(page.getByRole("heading", { level: 1, name: "Ton compte est prêt." })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("link", { name: "Faire le test de niveau" }).click();
    await expect(page).toHaveURL(/\/placement\/it$/);

    // The introduction sits over the entry screen; the test begins with a grammar question.
    const intro = page.getByRole("dialog", { name: "Test de niveau" });
    await expect(intro.getByText("30 questions au plus, souvent moins")).toBeVisible();
    await intro.getByRole("button", { name: "Commencer" }).click();
    await expect(page.getByText("Question 1 · Grammaire")).toBeVisible();
    await expect(page.getByRole("button", { name: "Valider" })).toBeDisabled();
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);

    // Stopping asks first and keeps nothing: the Progress page still offers the test.
    await page.getByRole("button", { name: "Arrêter le test" }).click();
    await expect(page.getByRole("dialog", { name: "Arrêter le test ?" })).toBeVisible();
    await page.getByRole("button", { name: "Arrêter", exact: true }).click();
    await expect(page).toHaveURL(/\/progress\?lang=it$/);
    await expect(page.getByRole("heading", { name: "Où en es-tu en italien ?" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    // Skipping every question of the first block ends the test at A1 after five questions.
    await page.getByRole("link", { name: "Faire le test de niveau" }).click();
    await page.getByRole("dialog", { name: "Test de niveau" }).getByRole("button", { name: "Commencer" }).click();
    for (let question = 1; question <= 5; question++) {
      await expect(page.getByText(new RegExp(`^Question ${question} · `))).toBeVisible();
      await page.getByRole("button", { name: "Je ne sais pas" }).click();
    }
    await expect(page.getByText("Niveau estimé")).toBeVisible();
    await expect(page.getByText("A1 · mesuré")).toBeVisible();
    await expect(page.getByText("Ce test mesure la lecture.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);

    // Another level can be picked, then the choice is kept and the path of the language opens.
    await page.getByRole("group", { name: "Choisir un autre niveau" }).getByRole("button", { name: "A2" }).click();
    await page.getByRole("button", { name: "Choisir A2" }).click();
    await expect(page).toHaveURL(/\/parcours\/it$/);

    // A finished test on the current bank: the Progress page no longer offers it, and Read shows the level kept.
    await page.goto("/progress");
    await expect(page.getByRole("heading", { name: "Où en es-tu en italien ?" })).toHaveCount(0);
    await expect(page.getByRole("row", { name: /Lire A2 Test de niveau/ })).toBeVisible();

    // On a wide screen the question has the rail of the levels visited.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/placement/it");
    await page.getByRole("dialog", { name: "Test de niveau" }).getByRole("button", { name: "Commencer" }).click();
    await expect(page.getByText("Niveaux visités")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    expect(errors).toEqual([]);
  });
});
