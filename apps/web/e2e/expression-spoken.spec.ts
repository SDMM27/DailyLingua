import { createServer } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { deleteTestUser, expectNoHorizontalOverflow, requireLocalSupabase, signUpAndInstall, uniqueEmail } from "./helpers";

/**
 * "Dire" in the expression step at 390 px: a fake SpeechRecognition (the test plays the learner voice through
 * window.__heard) and a fake AI provider, as the written expression test does. Needs the local Supabase stack.
 */
const port = Number(process.env.E2E_EXPRESSION_AI_PORT ?? 0);
const score = { score: 4, comment: "La réponse est claire." };
const original = "Io andare al mercato ogni sabato.";
const production = `${original} Compro frutta fresca, pane e formaggio per la mia famiglia. Al ritorno preparo il pranzo con mia sorella. Ci piace parlare con i venditori e conoscere le loro ricette. Dopo pranzo portiamo un dolce ai nostri vicini e restiamo con loro fino a sera. È il mio momento preferito della settimana.`;
// What the recognition gives: no capitals, no punctuation.
const transcript = production.toLocaleLowerCase().replace(/[.,]/g, "");
// Without punctuation the transcript is a single sentence: its native version is the whole corrected transcript.
const correctedTranscript = transcript.replace("io andare", "io vado");
const practiceLabel = /Entraînement à l.oral/;

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
      start() { scope.__speech = { lang: this.lang, continuous: this.continuous }; }
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

/** What the fake recognition delivers the next time the learner stops. */
const say = (page: Page, heard: string) => page.evaluate((value) => { (window as unknown as Record<string, unknown>).__heard = value; }, heard);

test.describe("spoken production", () => {
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
        corrections: [{ original: "io andare", corrected: "io vado", explanation: "Conjugue le verbe à la première personne.", category: "verb" }],
        strength: "Tu racontes ta journée avec des détails précis.",
        nativeVersion: correctedTranscript,
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

  async function seedText() {
    const { url, serviceRoleKey } = requireLocalSupabase();
    if (!serviceRoleKey) throw new Error("The isolated Supabase service key is required");
    const db = createClient(url, serviceRoleKey, { auth: { persistSession: false } }).schema("app");
    const textId = crypto.randomUUID();
    const task = "Racconta cosa fai al mercato.";
    const seeded = await db.from("text").insert({
      id: textId, language: "it", level_band: "A2", density: 1, theme: textId, prompt_version: "e2e",
      status: "published", title: "Al mercato il sabato", body: "Il sabato andiamo al mercato e compriamo la frutta.",
      word_count: 10, writing_task: task,
    });
    expect(seeded.error).toBeNull();
    return { db, textId, task };
  }

  async function reachExpression(page: Page, email: string) {
    await signUpAndInstall(page, email);
    await page.getByRole("button", { name: "Commencer la séance" }).click();
    await page.clock.install();
    await page.getByRole("button", { name: "Lire le texte" }).click();
    await page.clock.fastForward(5_000);
    await page.getByRole("button", { name: "Passer aux questions" }).click();
  }

  async function finishAfterExpression(page: Page) {
    await page.getByRole("button", { name: "Commencer la relecture" }).click();
    await page.clock.fastForward(12_000);
    await page.getByRole("button", { name: "Terminer la relecture" }).click();
    await expect(page.getByText("Tu racontes ta journée avec des détails précis.")).toBeVisible({ timeout: 25_000 });
  }

  test("dictates, sends, reads the correction and rewrites by voice", async ({ page }) => {
    test.setTimeout(90_000);
    requests = [];
    const { db, textId } = await seedText();
    const email = uniqueEmail("spoken");
    try {
      await installFakeRecognition(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await reachExpression(page, email);

      // A new learner has no spoken production: Dire is the default.
      const switcher = page.getByRole("group", { name: "Mode de réponse" });
      await expect(switcher.getByRole("button", { name: "Dire" })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("textbox")).toHaveCount(0);
      await expectNoHorizontalOverflow(page);

      await say(page, transcript);
      await page.getByRole("button", { name: "Commencer à parler" }).click();
      await page.getByRole("button", { name: "Compris" }).click();
      expect(await page.evaluate(() => (window as unknown as { __speech: unknown }).__speech)).toEqual({ lang: "it-IT", continuous: true });
      await expect(page.getByText("Ce que ton téléphone comprend")).toBeVisible();
      await page.clock.fastForward(20_000);
      await page.getByRole("button", { name: "Arrêter" }).click();

      await expect(page.getByText(/Ce que ton téléphone a compris · 0:/)).toBeVisible();
      await expect(page.getByText(/peut corriger certaines fautes sans le dire/)).toBeVisible();
      await expect(page.getByText(/Seul le texte est envoyé/)).toBeVisible();
      await expect(page.getByRole("textbox")).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await page.getByRole("button", { name: "Envoyer pour correction" }).click();
      await finishAfterExpression(page);

      await expect(page.getByText(practiceLabel)).toBeVisible();
      await expect(page.getByText("Ce que ton téléphone a compris", { exact: true })).toBeVisible();
      expect(requests).toHaveLength(1);
      expect(JSON.parse(requests[0]!.messages[0]!.content)).toMatchObject({ inputMode: "speech_transcript", text: transcript });
      await expectNoHorizontalOverflow(page);

      // The rewrite can be spoken: the field is filled and stays editable.
      await page.getByText("Voir la correction", { exact: true }).click();
      await say(page, correctedTranscript);
      await page.getByRole("button", { name: "Dicter la phrase 1" }).click();
      await page.getByRole("button", { name: "Arrêter la dictée" }).click();
      await expect(page.getByRole("textbox", { name: /Réécris de mémoire/ })).toHaveValue(correctedTranscript);
      await page.getByRole("button", { name: "Vérifier ma réécriture" }).click();
      await expect(page.getByText("Réécriture vérifiée.")).toBeVisible({ timeout: 25_000 });

      const stored = await db.from("production").select("mode, task").eq("text", transcript);
      expect(stored.data).toEqual([expect.objectContaining({ mode: "spoken", task: expect.objectContaining({ speakingMs: expect.any(Number) }) })]);
    } finally {
      await deleteTestUser(email);
      expect((await db.from("text").delete().eq("id", textId)).error).toBeNull();
    }
  });

  test("moving to Écrire carries the transcript and the production is a written one", async ({ page }) => {
    test.setTimeout(60_000);
    requests = [];
    const { db, textId, task } = await seedText();
    const email = uniqueEmail("spoken-write");
    try {
      await installFakeRecognition(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await reachExpression(page, email);
      await say(page, transcript);
      await page.getByRole("button", { name: "Commencer à parler" }).click();
      await page.getByRole("button", { name: "Compris" }).click();
      await page.getByRole("button", { name: "Arrêter" }).click();
      await page.getByRole("group", { name: "Mode de réponse" }).getByRole("button", { name: "Écrire" }).click();
      await expect(page.getByRole("textbox", { name: task })).toHaveValue(transcript);
      await page.getByRole("button", { name: "Enregistrer mon texte" }).click();
      await finishAfterExpression(page);
      await expect(page.getByText(practiceLabel)).toHaveCount(0);
      expect(JSON.parse(requests[0]!.messages[0]!.content)).toMatchObject({ inputMode: "typed" });
    } finally {
      await deleteTestUser(email);
      expect((await db.from("text").delete().eq("id", textId)).error).toBeNull();
    }
  });

  test("without speech recognition there is no selector, only the field", async ({ page }) => {
    test.setTimeout(60_000);
    requests = [];
    const { db, textId, task } = await seedText();
    const email = uniqueEmail("spoken-none");
    try {
      await page.addInitScript(() => {
        Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true });
        Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true });
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await reachExpression(page, email);
      await expect(page.getByRole("textbox", { name: task })).toBeVisible();
      await expect(page.getByRole("group", { name: "Mode de réponse" })).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
    } finally {
      await deleteTestUser(email);
      expect((await db.from("text").delete().eq("id", textId)).error).toBeNull();
    }
  });
});
