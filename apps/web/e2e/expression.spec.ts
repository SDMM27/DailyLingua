import { createServer } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { deleteTestUser, expectNoHorizontalOverflow, requireLocalSupabase, signUpAndInstall, uniqueEmail } from "./helpers";

const port = Number(process.env.E2E_EXPRESSION_AI_PORT ?? 0);
const score = { score: 4, comment: "La réponse est claire." };
const original = "Io andare al mercato ogni sabato.";
const corrected = "Io vado al mercato ogni sabato.";
const production = `${original} Compro frutta fresca, pane e formaggio per la mia famiglia. Al ritorno preparo il pranzo con mia sorella. Ci piace parlare con i venditori e conoscere le loro ricette. Dopo pranzo portiamo un dolce ai nostri vicini e restiamo con loro fino a sera. È il mio momento preferito della settimana.`;

test.describe("offline writing and server-verified rewrite", () => {
  test.skip(!port, "Set E2E_EXPRESSION_AI_PORT to run with a local fake provider.");
  let requests: { system: unknown; messages: { content: string }[] }[];
  const fixture = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    requests.push(JSON.parse(body));
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({
      id: "msg_e2e", type: "message", role: "assistant", model: "claude-haiku-5-5", stop_reason: "end_turn",
      usage: { input_tokens: 20, output_tokens: 100 },
      content: [{ type: "text", text: JSON.stringify({
        grammar: score, vocabulary: score, register: score, coherence: score,
        corrections: [{ original: "Io andare", corrected: "Io vado", explanation: "Conjugue le verbe à la première personne.", category: "verb" }],
        strength: "Tu racontes ta journée avec des détails précis.",
        nativeVersion: production.replace(original, corrected),
        detectedLanguage: "it",
      }) }],
    }));
  });

  test.beforeAll(async () => {
    requireLocalSupabase();
    await new Promise<void>((resolve, reject) => {
      fixture.once("error", reject);
      fixture.listen(port, "127.0.0.1", resolve);
    });
  });

  test.afterAll(async () => {
    if (fixture.listening) await new Promise<void>((resolve) => { fixture.close(() => resolve()); });
  });

  for (const appearance of ["light", "dark"] as const) {
    test(`recovers writing after a restart and reconnect at 390 px in ${appearance}`, async ({ page }, testInfo) => {
      test.setTimeout(75_000);
      requests = [];
      const { url, serviceRoleKey } = requireLocalSupabase();
      if (!serviceRoleKey) throw new Error("The isolated Supabase service key is required");
      const db = createClient(url, serviceRoleKey, { auth: { persistSession: false } }).schema("app");
      const textId = crypto.randomUUID();
      const email = uniqueEmail("feedback");
      const title = "Al mercato il sabato";
      const task = "Racconta cosa fai al mercato.";
      const seeded = await db.from("text").insert({
        id: textId, language: "it", level_band: "A2", density: 1, theme: textId, prompt_version: "e2e",
        status: "published", title, body: "Il sabato andiamo al mercato e compriamo la frutta.",
        word_count: 10, writing_task: task,
      });
      expect(seeded.error).toBeNull();
      try {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.emulateMedia({ colorScheme: appearance });
        await signUpAndInstall(page, email);
        await expect(page.getByText(title, { exact: true })).toBeVisible();
        await expect(page.getByText("Prête hors ligne")).toBeVisible();
        await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
        await page.getByRole("button", { name: "Commencer la séance" }).click();
        await page.clock.install();
        await page.context().setOffline(true);
        try {
          await page.getByRole("button", { name: "Lire le texte" }).click();
          await page.clock.fastForward(5_000);
          await page.getByRole("button", { name: "Passer aux questions" }).click();
          await page.getByRole("textbox", { name: task }).fill(production);
          await page.getByRole("button", { name: "Enregistrer mon texte" }).click();
          await page.getByRole("button", { name: "Commencer la relecture" }).click();
          await page.clock.fastForward(12_000);
          await page.getByRole("button", { name: "Terminer la relecture" }).click();
          await expect(page.getByText(/Ton texte est en attente de correction/)).toBeVisible();
          await expectNoHorizontalOverflow(page);
          await page.reload({ waitUntil: "domcontentloaded" });
          await page.getByRole("button", { name: /Reprendre/ }).click();
          await expect(page.getByText(/Ton texte est en attente de correction/)).toBeVisible();
          expect(requests).toHaveLength(0);
        } finally {
          await page.context().setOffline(false);
        }

        await expect(page.getByText("Tu racontes ta journée avec des détails précis.")).toBeVisible({ timeout: 25_000 });
        await page.getByText("Voir la correction", { exact: true }).click();
        const explanation = page.locator("details").getByText("Conjugue le verbe à la première personne.", { exact: true });
        await expect(explanation).toBeVisible();
        await expect(explanation).toHaveAttribute("lang", "fr");
        await expectNoHorizontalOverflow(page);
        await page.screenshot({ path: testInfo.outputPath("correction.png"), fullPage: true });
        expect(requests).toHaveLength(1);
        expect(requests[0]?.messages[0]?.content).toContain(production);
        expect(JSON.stringify(requests[0]?.system)).not.toContain(production);

        await page.getByRole("textbox", { name: /Réécris de mémoire/ }).fill(corrected);
        await page.getByRole("button", { name: "Vérifier ma réécriture" }).click();
        await expect(page.getByText("Réécriture vérifiée.")).toBeVisible({ timeout: 25_000 });
        await expectNoHorizontalOverflow(page);
        expect(requests).toHaveLength(1);

        await page.goto("/settings");
        await expect(page.getByRole("heading", { name: "Rappels" })).toBeVisible();
        await expect(page.getByLabel("Heure du rappel")).toHaveValue("19:00");
        await expect(page.getByText(/Fuseau horaire actuel/)).toBeVisible();
        await expectNoHorizontalOverflow(page);
      } finally {
        await deleteTestUser(email);
        const removed = await db.from("text").delete().eq("id", textId);
        expect(removed.error).toBeNull();
      }
    });
  }
});
