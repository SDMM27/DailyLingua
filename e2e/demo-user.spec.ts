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
