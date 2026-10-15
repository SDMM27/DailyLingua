import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { collectErrors, expectNoHorizontalOverflow, requireLocalSupabase } from "./helpers";

const EMAIL = `e2e-${Date.now()}@dailylingua.test`;
const PASSWORD = "e2e-password-123";
const FEEDBACK_MESSAGE = `Test E2E ${Date.now()} : une idée pour l’app`;

// The local database has no ingested feed (the seed's Italian contents have no feed source), so the
// mission of the new user is built from a throw-away Italian source and article created here.
const RUN_ID = `${Date.now()}`;
let sourceId: string | undefined;

function adminClient() {
  const { url, serviceRoleKey } = requireLocalSupabase();
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY est requis pour préparer et nettoyer les données des tests E2E.");
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

test.beforeAll(async () => {
  const admin = adminClient();
  const source = await admin
    .from("sources")
    .insert({
      key: `e2e-it-${RUN_ID}`,
      name: "Source E2E",
      language: "it",
      homepage_url: `https://e2e-${RUN_ID}.example.invalid/`,
      feed_url: `https://e2e-${RUN_ID}.example.invalid/feed`,
      content_type: "article",
      license_kind: "all-rights-reserved",
      license_name: "Tous droits réservés",
      terms_url: "https://example.invalid/terms",
      license_verified_on: "2026-10-01",
      commercial_use: false,
      active: true,
    })
    .select("id")
    .single();
  if (source.error) throw source.error;
  sourceId = source.data.id;
  const content = await admin.from("contents").insert({
    source_id: sourceId,
    language: "it",
    content_type: "article",
    title: `Article E2E ${RUN_ID}`,
    url: `https://e2e-${RUN_ID}.example.invalid/1`,
    difficulty: "B1",
    duration_minutes: 5,
    summary: "Un article de test pour les tests de bout en bout.",
    // Newer than anything else, so that it is the one picked.
    published_at: new Date(Date.now() + 3_600_000).toISOString(),
  });
  if (content.error) throw content.error;
});

// Everything is removed even when the test fails half-way (the account is already gone after a normal run).
test.afterAll(async () => {
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = data?.users.find((u) => u.email === EMAIL);
  // The user first: deleting it cascades to its missions, which reference the content.
  if (user) await admin.auth.admin.deleteUser(user.id);
  if (sourceId) {
    await admin.from("contents").delete().eq("source_id", sourceId);
    await admin.from("sources").delete().eq("id", sourceId);
  }
});

test("a new user signs up, studies, adds a word and deletes the account", async ({ page }) => {
  const { errors } = collectErrors(page);

  // Sign up (e-mail confirmation is off on the local stack).
  await page.goto("/connexion");
  await page.getByRole("button", { name: "Créer un compte" }).click();
  await page.getByLabel("Adresse e-mail").fill(EMAIL);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  // First run: choose a language.
  await expect(page).toHaveURL(/\/bienvenue$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Quelles langues");
  await page.getByRole("button", { name: "Italien" }).click();
  await page.getByRole("button", { name: "Commencer" }).click();
  // Last onboarding step: the level test, which can be left for later.
  await expect(page).toHaveURL(/\/niveau\?bienvenue=1$/);
  await expect(page.getByText("Pas encore évalué")).toBeVisible();
  await page.getByRole("link", { name: "Continuer vers ma mission" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Today's mission is prepared on first visit (template generator).
  await page.goto("/mission");
  await expect(page.getByText("Exercices simplifiés")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mission du jour");
  await expectNoHorizontalOverflow(page);

  // Vocabulary: add a word.
  await page.goto("/vocabulaire");
  await page.getByRole("button", { name: "Ajouter" }).click();
  await page.getByLabel("Mot ou expression").fill("arrivederci");
  await page.getByLabel("Traduction").fill("au revoir");
  await page.getByRole("button", { name: "Ajouter", exact: true }).last().click();
  await expect(page.getByText("arrivederci")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Feedback, from the settings.
  await page.goto("/preferences");
  await page.getByRole("link", { name: "Envoyer un retour" }).click();
  await expect(page).toHaveURL(/\/retour\?depuis=(%2F|\/)preferences$/);
  await page.getByRole("radio", { name: "Idée" }).check({ force: true });
  await page.getByLabel("Ton message").fill(FEEDBACK_MESSAGE);
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Merci !")).toBeVisible();
  const admin = adminClient();
  const sent = await admin.from("feedback").select("user_id, category, page").eq("message", FEEDBACK_MESSAGE);
  expect(sent.data).toHaveLength(1);
  expect(sent.data?.[0]).toMatchObject({ category: "idee", page: "/preferences" });
  const feedbackUserId = sent.data![0].user_id;

  // Settings: delete the account.
  await page.goto("/preferences");
  await page.getByRole("button", { name: "Supprimer mon compte…" }).click();
  await page.getByLabel("Ton adresse e-mail pour confirmer").fill(EMAIL);
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(page).toHaveURL(/\/connexion/);

  // The feedback went with the account.
  const left = await admin.from("feedback").select("id", { count: "exact", head: true }).eq("user_id", feedbackUserId);
  expect(left.error).toBeNull();
  expect(left.count).toBe(0);

  expect(errors).toEqual([]);
});
