import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { deleteTestUser, expectNoHorizontalOverflow, requireLocalSupabase, signUpAndInstall, uniqueEmail } from "./helpers";

test("a published A2 text opens from Today and the library, and saves one review card with its context", async ({ page }, testInfo) => {
  const { url, serviceRoleKey } = requireLocalSupabase();
  if (!serviceRoleKey) throw new Error("The isolated Supabase service key is required");
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const db = admin.schema("app");
  const id = crypto.randomUUID();
  const email = uniqueEmail("reader");
  const sentence = "Oggi vado al mercato con mia sorella.";
  const title = "Sabato al mercato";
  const { error } = await db.from("text").insert({
    id, language: "it", level_band: "A2", density: 1, theme: id, prompt_version: "e2e",
    title, body: sentence, word_count: 7, status: "published", writing_task: "Descrivi il tuo sabato.",
    new_words: [{ lemma: "mercato", dictionaryForm: "mercato", definition: "Luogo dove si vendono prodotti.", sentence: 0, glosses: { fr: "marché" } }],
  });
  expect(error).toBeNull();
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await signUpAndInstall(page, email);
    await page.getByRole("link", { name: "Ouvrir dans le lecteur" }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("Audio en préparation.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "mercato", exact: true }).click();
    await expect(page.getByText("marché", { exact: true })).toHaveAttribute("lang", "fr");
    await expect(page.locator("article")).toHaveText(sentence);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("reader-light.png") });
    await page.getByRole("button", { name: "Ajouter à mes révisions" }).click();
    await expect(page.getByRole("status")).toHaveText("Ajouté à tes révisions.");

    await page.getByRole("link", { name: "Bibliothèque" }).click();
    await page.getByRole("link", { name: new RegExp(title) }).click();
    await page.getByRole("button", { name: "mercato", exact: true }).click();
    await page.emulateMedia({ colorScheme: "dark" });
    await expectNoHorizontalOverflow(page);
    await expect.poll(() => page.getByRole("button", { name: "Fermer" }).evaluate(
      (button) => getComputedStyle(button).color === getComputedStyle(document.body).color,
    )).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("reader-dark.png") });
    await page.getByRole("button", { name: "Ajouter à mes révisions" }).click();
    await expect(page.getByRole("status")).toHaveText("Ajouté à tes révisions.");

    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    const owner = users.users.find((user) => user.email === email);
    expect(owner).toBeDefined();
    const cards = await db.from("card").select("front, back, back_language, context, state")
      .eq("user_id", owner!.id).eq("source", "reader");
    expect(cards.error).toBeNull();
    expect(cards.data).toEqual([{ front: "mercato", back: "marché", back_language: "fr", context: sentence, state: "new" }]);
  } finally {
    await deleteTestUser(email);
    const removed = await db.from("text").delete().eq("id", id);
    expect(removed.error).toBeNull();
  }
});
