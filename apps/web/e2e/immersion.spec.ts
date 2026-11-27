import { expect, test } from "@playwright/test";
import { deleteTestUser, expectNoHorizontalOverflow, signUpAndInstall, uniqueEmail } from "./helpers";

test("the progress page declares, edits and deletes immersion time, and the summary follows", async ({ page }) => {
  const email = uniqueEmail("immersion");
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await signUpAndInstall(page, email);
    await page.getByRole("link", { name: "Progrès" }).click();
    const section = page.getByRole("region", { name: "Immersion" });
    const summary = section.getByTestId("immersion-summary");
    await expect(summary).toContainText("0 min dans l’app");
    await expect(summary).toContainText("0 min déclarées");
    await expect(section.getByText("Aucun temps déclaré")).toBeVisible();

    // Add 45 minutes of video: only the declared part of the summary moves.
    await section.getByRole("button", { name: "Ajouter du temps" }).click();
    await section.getByLabel("Minutes").fill("45");
    await section.getByRole("radio", { name: "Vidéo" }).check({ force: true });
    await section.getByRole("button", { name: "Enregistrer" }).click();
    await expect(summary).toContainText("45 min déclarées");
    await expect(summary).toContainText("0 min dans l’app");
    await expect(section.getByRole("button", { name: /^Modifier : .*Vidéo · 45 min/ })).toBeVisible();

    // Edit it to 1 h 10 of audio.
    await section.getByRole("button", { name: /^Modifier : / }).click();
    await section.getByLabel("Minutes").fill("70");
    await section.getByRole("radio", { name: "Audio" }).check({ force: true });
    await section.getByRole("button", { name: "Enregistrer" }).click();
    await expect(summary).toContainText("1 h 10 déclarées");
    await expect(section.getByRole("button", { name: /^Modifier : .*Audio · 1 h 10/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    // Delete it, after a light confirmation.
    await section.getByRole("button", { name: /^Supprimer : / }).click();
    await section.getByRole("button", { name: /^Confirmer la suppression/ }).click();
    await expect(summary).toContainText("0 min déclarées");
    await expect(section.getByText("Aucun temps déclaré")).toBeVisible();
    // Changing the active language (a second enrolled language) re-counts per language: not covered here, the
    // installation helper enrols a single language; the per-language isolation is covered by the loader tests.
  } finally {
    await deleteTestUser(email);
  }
});
