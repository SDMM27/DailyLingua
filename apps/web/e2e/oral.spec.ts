import { expect, test, type Page } from "@playwright/test";
import { collectErrors, deleteTestUser, expectNoAxeViolations, expectNoHorizontalOverflow, requireLocalSupabase, signUpAndInstall, uniqueEmail } from "./helpers";

/**
 * « À voix haute » on an iPhone-sized screen, in light and in dark. The recognition is a fake one injected before the
 * page loads: it hears whatever the test put in `window.__heard` when the learner stops. Needs the local Supabase stack.
 */
test.beforeAll(() => {
  requireLocalSupabase();
});

/** A `SpeechRecognition` that delivers `window.__heard` (the test plays the learner's voice). */
function installFakeRecognition(page: Page) {
  return page.addInitScript(() => {
    const scope = window as unknown as Record<string, unknown>;
    class FakeRecognition {
      lang = "";
      interimResults = false;
      continuous = false;
      maxAlternatives = 1;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() { scope.__speechLang = this.lang; }
      stop() {
        const text = String(scope.__heard ?? "");
        if (text) this.onresult?.({ results: [Object.assign([{ transcript: text }], { isFinal: true })] });
        this.onend?.();
      }
      abort() { /* Nothing is delivered. */ }
    }
    scope.SpeechRecognition = FakeRecognition;
    scope.webkitSpeechRecognition = FakeRecognition;
  });
}

/** The sentence on screen, in the language of the unit. */
const sentenceOnScreen = (page: Page) => page.locator("section[data-unit] [lang='it']").first();

test.describe("À voix haute", () => {
  const emails: string[] = [];

  test.afterAll(async () => {
    for (const email of emails) await deleteTestUser(email);
  });

  for (const appearance of ["light", "dark"] as const) {
    test(`walks the three parts at 390 px in ${appearance}`, async ({ page }) => {
      test.setTimeout(120_000);
      const email = uniqueEmail("oral");
      emails.push(email);
      const { errors } = collectErrors(page);
      await installFakeRecognition(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ colorScheme: appearance });
      await signUpAndInstall(page, email);

      // Today: a secondary card under the session, one button.
      await expect(page.getByRole("heading", { level: 2, name: "Cinq minutes à voix haute" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.getByRole("link", { name: "Ouvrir", exact: true }).click();
      await expect(page).toHaveURL(/\/oral$/);

      // Entry: full screen, no tab bar, what is in it and where the voice goes.
      await expect(page.getByRole("heading", { level: 1, name: "Cinq minutes à voix haute" })).toBeVisible();
      await expect(page.getByText(/jamais ta voix/)).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Navigation" })).toBeHidden();
      await expectNoHorizontalOverflow(page);
      await expectNoAxeViolations(page);
      await page.getByRole("button", { name: "Commencer" }).click();

      let repeated = 0;
      let dictated = 0;
      for (let step = 0; step < 40; step++) {
        if (await page.getByRole("heading", { name: "« À voix haute » terminé" }).isVisible()) break;
        if (await page.getByRole("button", { name: "Écouter la réponse" }).isVisible()) {
          // Anticipation: the meaning first, then the voice and the text, three buttons and the « Déclaré » chip.
          if (step === 0) {
            await expectNoHorizontalOverflow(page);
            await expectNoAxeViolations(page);
          }
          await page.getByRole("button", { name: "Écouter la réponse" }).click();
          await expect(page.getByText("Déclaré · sans XP")).toBeVisible();
          if (step === 0) {
            await expectNoHorizontalOverflow(page);
            await expectNoAxeViolations(page);
          }
          await page.getByRole("button", { name: repeated % 2 === 0 ? "Je l’avais" : "Presque" }).click();
        } else if (await page.getByRole("button", { name: "Répéter la phrase" }).isVisible()) {
          const model = await sentenceOnScreen(page).innerText();
          // Every other sentence is said badly: a calm « À reprendre », no second claim of success.
          const good = repeated % 2 === 0;
          await page.evaluate((text) => { (window as unknown as Record<string, unknown>).__heard = text; }, good ? model : "qualcosa di diverso");
          await page.getByRole("button", { name: "Répéter la phrase" }).click();
          if (repeated === 0) {
            // First use: the sheet on where the voice goes.
            await expect(page.getByRole("dialog", { name: "Avant de parler" })).toBeVisible();
            await expectNoAxeViolations(page);
            await page.getByRole("button", { name: "Compris" }).click();
            expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__speechLang)).toBe("it-IT");
            await expectNoHorizontalOverflow(page);
            await expectNoAxeViolations(page);
          }
          await page.getByRole("button", { name: "Arrêter et comparer" }).click();
          const sheet = page.getByRole("status", { name: good ? "Bien repris" : "À reprendre" });
          await expect(sheet).toBeVisible();
          if (good) await expect(sheet.getByText("+1 XP")).toBeVisible();
          else await expect(sheet.getByText(/XP/)).toHaveCount(0);
          if (repeated < 2) {
            await expectNoHorizontalOverflow(page);
            await expectNoAxeViolations(page);
          }
          await sheet.getByRole("button", { name: good ? "Continuer" : "Réessayer" }).click();
          if (!good) {
            // The second try is the same sentence again; the learner moves on after it.
            await page.getByRole("button", { name: "Répéter la phrase" }).click();
            await page.getByRole("button", { name: "Arrêter et comparer" }).click();
            await page.getByRole("status", { name: "À reprendre" }).getByRole("button", { name: "Passer à la suite" }).click();
          }
          repeated += 1;
        } else if (await page.getByRole("textbox", { name: "Ta dictée" }).isVisible()) {
          // Dictation: a wrong text shows the character diff and the sentence.
          await page.getByRole("textbox", { name: "Ta dictée" }).fill("ciao");
          await page.getByRole("button", { name: "Vérifier" }).click();
          const sheet = page.getByRole("status", { name: /À reprendre|Presque tout|Juste/ });
          await expect(sheet).toBeVisible();
          if (dictated === 0) {
            await expect(sheet.getByText("La phrase")).toBeVisible();
            await expectNoHorizontalOverflow(page);
            await expectNoAxeViolations(page);
          }
          await sheet.getByRole("button", { name: "Continuer" }).click();
          dictated += 1;
        } else {
          await page.waitForTimeout(150);
        }
      }

      // End: the estimate, sent or waiting, never presented as confirmed before the queue has delivered.
      await expect(page.getByRole("heading", { name: "« À voix haute » terminé" })).toBeVisible();
      await expect(page.getByText(/≈ \+\d+ XP · (envoyé au serveur|en attente du réseau)/)).toBeVisible();
      await expect(page.getByText("Phrases répétées")).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoAxeViolations(page);
      expect(repeated).toBeGreaterThan(0);
      expect(dictated).toBeGreaterThan(0);

      await page.getByRole("button", { name: "Terminer" }).click();
      await expect(page).toHaveURL(/\/$/);
      expect(errors).toEqual([]);
    });
  }

  test("without speech recognition the repetition is self-rated and declared", async ({ page }) => {
    test.setTimeout(60_000);
    const email = uniqueEmail("oral-none");
    emails.push(email);
    const { errors } = collectErrors(page);
    // Firefox-like: no recognition at all.
    await page.addInitScript(() => {
      const scope = window as unknown as Record<string, unknown>;
      delete scope.SpeechRecognition;
      delete scope.webkitSpeechRecognition;
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await signUpAndInstall(page, email);
    await page.getByRole("link", { name: "Ouvrir", exact: true }).click();
    await page.getByRole("button", { name: "Commencer" }).click();
    await page.getByRole("button", { name: "Écouter la réponse" }).click();
    await page.getByRole("button", { name: "Pas encore" }).click();

    await expect(page.getByText(/ne reconnaît pas la parole/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Répéter la phrase" })).toHaveCount(0);
    await expect(page.getByText("Déclaré · sans XP")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Proche" }).click();
    await expect(page.getByRole("button", { name: "Écouter la réponse" })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
