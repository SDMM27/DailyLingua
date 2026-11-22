import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { deleteTestUser, expectNoHorizontalOverflow, requireLocalSupabase, signUpAndInstall, uniqueEmail } from "./helpers";

test("the Italian A2 reader estimates coverage, plays shared audio, and saves a word", async ({ page }, testInfo) => {
  const { url, serviceRoleKey } = requireLocalSupabase();
  if (!serviceRoleKey) throw new Error("The isolated Supabase service key is required");
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const db = admin.schema("app");
  const email = uniqueEmail("reader-audio");
  const title = "La lista della spesa";
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await signUpAndInstall(page, email);
    await page.getByRole("link", { name: "Lire", exact: true }).click();
    await page.getByRole("link", { name: new RegExp(title) }).click();
    const before = page.getByRole("region", { name: "Avant de lire" });
    await expect(before).toContainText("Pas encore assez de révisions");

    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    const owner = users.users.find((user) => user.email === email);
    expect(owner).toBeDefined();
    const now = Date.now();
    const due = new Date(now + 86_400_000).toISOString();
    const overdue = new Date(now - 86_400_000).toISOString();
    const rows = [
      { front: "burro", state: "known", reps: 0, due_at: due },
      { front: "importante", state: "review", reps: 2, due_at: due },
      { front: "mercato", state: "review", reps: 2, due_at: overdue },
      { front: "casa", state: "new", reps: 0, due_at: due },
    ];
    const seeded = await db.from("card").insert(rows.map((row) => ({
      ...row, user_id: owner!.id, language: "it", kind: "word",
      ...(row.state === "review" ? { last_review_at: overdue, stability: 2, difficulty: 4 } : {}),
    })));
    expect(seeded.error).toBeNull();
    await page.reload();
    await expect(before).toContainText("3 mots repérés sur 51");

    const audio = before.locator("audio");
    await expect(audio).toHaveAttribute("src", "/reader-audio/la-lista-della-spesa-v1.mp3");
    await audio.evaluate((element: HTMLAudioElement) => element.load());
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.duration)).toBeGreaterThan(12);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("reader-audio-coverage-light.png"), animations: "disabled" });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.screenshot({ path: testInfo.outputPath("reader-audio-coverage-dark.png"), animations: "disabled" });

    // Use a real user gesture to satisfy WebKit's media playback policy.
    await audio.evaluate((element: HTMLAudioElement) => {
      document.addEventListener("click", () => { void element.play().catch(() => undefined); }, { once: true });
    });
    await page.getByRole("button", { name: "importante", exact: true }).click();
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
    await audio.evaluate((element: HTMLAudioElement) => element.pause());
    await page.getByRole("button", { name: "Ajouter à mes révisions" }).click();
    await expect(page.getByRole("status")).toHaveText("Ajouté à tes révisions.");
  } finally {
    await deleteTestUser(email);
  }
});
