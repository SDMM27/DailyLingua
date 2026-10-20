import { expect, test } from "@playwright/test";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  collectErrors,
  expectNoHorizontalOverflow,
  requireLocalSupabase,
  signIn,
} from "./helpers";

test.beforeAll(() => {
  requireLocalSupabase();
});

// Labels of src/components/layout/nav-items.ts.
const TABS = [
  { label: "Aujourd'hui", path: "/" },
  { label: "Mission", path: "/mission" },
  { label: "Lire", path: "/lire" },
  { label: "Mots", path: "/vocabulaire" },
  { label: "Réglages", path: "/preferences" },
];

test("the demo account walks through every tab of the bottom bar", async ({ page }) => {
  const { errors } = collectErrors(page);
  await signIn(page, DEMO_EMAIL, DEMO_PASSWORD);

  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  for (const { label, path } of TABS) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(path === "/" ? /\/$/ : new RegExp(`${path}$`));
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  expect(errors).toEqual([]);
});

test("the demo account can run a placement test up to its result", async ({ page }) => {
  const { errors } = collectErrors(page);
  await signIn(page, DEMO_EMAIL, DEMO_PASSWORD);

  await page.goto("/niveau");
  await expect(page.getByRole("heading", { level: 1, name: "Où en es-tu ?" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: /(Faire|Refaire) le test/ }).first().click();
  await expect(page).toHaveURL(/\/niveau\/[a-z]{2}$/);
  await page.getByRole("button", { name: "Commencer" }).click();

  // Answering "I don't know" every time fails each block of 5 questions, going down from the
  // declared level to A1; the test asks 30 questions at most (src/lib/domain/placement.ts).
  const result = page.getByText("Niveau estimé");
  for (let i = 0; i < 30 && (await result.count()) === 0; i++) {
    await expect(page.getByText(`Question ${i + 1}`)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Je ne sais pas" }).click();
  }
  await expect(result).toBeVisible();
  await expect(page.getByLabel("Niveau à retenir")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Nothing is saved: leave through "Recommencer" then "Passer le test".
  await page.getByRole("button", { name: "Recommencer" }).click();
  await page.getByRole("link", { name: "Passer le test" }).click();
  await expect(page).toHaveURL(/\/niveau$/);

  expect(errors).toEqual([]);
});
