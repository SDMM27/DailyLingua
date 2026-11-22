import { expect, test } from "@playwright/test";
import { deleteTestUser, expectNoHorizontalOverflow, signUpAndInstall, uniqueEmail } from "./helpers";

test("the reader offers Spanish comparisons for a declared language and hides them after removal", async ({ page }, testInfo) => {
  const email = uniqueEmail("known-languages");
  const title = "La lista della spesa";
  async function openPilot() {
    await page.getByRole("link", { name: "Lire", exact: true }).click();
    await page.getByRole("link", { name: new RegExp(title) }).click();
  }
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await signUpAndInstall(page, email, "espagnol");
    await openPilot();
    await page.getByRole("button", { name: "importante", exact: true }).click();
    const same = page.getByRole("complementary", { name: "Même sens en espagnol" });
    await expect(same.getByText("Es importante hacer una lista.")).toHaveAttribute("lang", "es");
    await page.getByRole("button", { name: "burro", exact: true }).click();
    const different = page.getByRole("complementary", { name: "Faux ami en espagnol" });
    await expect(different).toContainText("âne");
    await expect(page.getByText("beurre", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("reader-comparison-light.png") });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.screenshot({ path: testInfo.outputPath("reader-comparison-dark.png") });

    await page.getByRole("link", { name: "Réglages" }).click();
    const form = page.getByRole("form", { name: "Langues déjà connues" });
    await form.getByRole("button", { name: "Retirer espagnol" }).click();
    await form.getByRole("button", { name: "Enregistrer" }).click();
    await expect(form.getByText("Réglages enregistrés.")).toBeVisible();
    await openPilot();
    await page.getByRole("button", { name: "burro", exact: true }).click();
    await expect(different).toHaveCount(0);
    await expect(page.getByText("beurre", { exact: true })).toBeVisible();
  } finally {
    await deleteTestUser(email);
  }
});
