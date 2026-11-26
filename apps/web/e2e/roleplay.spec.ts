import type { RoleplayGame, RoleplayTurnRequest } from "@dailylingua/schemas";
import { expect, test } from "@playwright/test";
import { deleteTestUser, expectNoHorizontalOverflow, requireLocalSupabase, signUpAndInstall, uniqueEmail } from "./helpers";

test.use({ serviceWorkers: "block" });

test("plays by keyboard and voice, then reports only confirmed XP", async ({ page }) => {
  test.setTimeout(90_000);
  requireLocalSupabase();
  const email = uniqueEmail("roleplay");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const voiceText = "Vorrei anche un cornetto, per favore.";
  const opening = { role: "ai", text: "Buongiorno! Cosa prende?", translation: "Bonjour ! Que prenez-vous ?", at: now } as const;
  const requests: RoleplayTurnRequest[] = [];
  let current: RoleplayGame | null = null;
  let sentCompletion = false;

  await page.addInitScript(({ heard }) => {
    class FakeRecognition {
      onresult: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() { /* The learner stops the microphone in the test. */ }
      stop() {
        this.onresult?.({ results: [Object.assign([{ transcript: heard }], { isFinal: true })] });
        this.onend?.();
      }
      abort() { /* No transcript follows an abort. */ }
    }
    Object.assign(window, { SpeechRecognition: FakeRecognition, webkitSpeechRecognition: FakeRecognition });
  }, { heard: voiceText });

  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await signUpAndInstall(page, email);
    await page.route("**/api/roleplay**", async (route) => {
      const request = route.request();
      expect(request.headers()["x-dailylingua-user"]).toMatch(/^[0-9a-f-]{36}$/);
      const { pathname } = new URL(request.url());
      if (request.method() === "GET") {
        const finished = current?.status === "finished" ? current : null;
        return route.fulfill({ json: {
          status: "state", active: current?.status === "active" ? current : null, today: current,
          latestFinished: finished, xp: sentCompletion ? 15 : 0, level: "A1", offered: ["cafe-order", "ask-directions"], canStart: !current,
        } });
      }
      if (pathname === "/api/roleplay") {
        expect(request.postDataJSON()).toEqual({ scenarioId: "cafe-order", language: "it" });
        current = {
          id, scenarioId: "cafe-order", language: "it", level: "A1", status: "active",
          turns: [opening], objectivesMet: [false, false, false], learnerTurns: 0,
          turnsLeft: 8, review: null, createdAt: now, finishedAt: null,
        };
        return route.fulfill({ json: { status: "ready", game: current, reply: { text: opening.text, translation: opening.translation } } });
      }
      if (!current) throw new Error("No game has started");
      if (pathname.endsWith("/turns")) {
        const turn = request.postDataJSON() as RoleplayTurnRequest;
        requests.push(turn);
        const reply = { text: "Va bene. Altro?", translation: "Très bien. Autre chose ?" };
        const count = requests.length;
        current = {
          ...current, turns: [...current.turns, { role: "learner", ...turn, at: now }, { role: "ai", ...reply, at: now }],
          objectivesMet: [true, count >= 2, count === 3], learnerTurns: count, turnsLeft: count === 3 ? 0 : 8 - count,
        };
        return route.fulfill({ json: { status: "ready", game: current, reply } });
      }
      expect(pathname).toBe(`/api/roleplay/${id}/finish`);
      current = {
        ...current, status: "finished", turnsLeft: 0, finishedAt: now,
        review: {
          objectives: [{ met: true, comment: "Boisson commandée." }, { met: true, comment: "Viennoiserie commandée." }, { met: true, comment: "Addition demandée." }],
          errors: [{ original: "per piacere", corrected: "per favore", explanation: "Cette formule est plus courante ici." }],
          betterPhrasings: [], detectedLanguage: "it",
        },
      };
      return route.fulfill({ json: { status: "ready", game: current, reply: null } });
    });
    await page.route("**/api/events", async (route) => {
      const batch = route.request().postDataJSON() as { kind: string; clientEventId: string; payload: { roleplayId?: string } }[];
      const completion = batch.find((event) => event.kind === "roleplay_completed");
      if (!completion) return route.continue();
      expect(completion).toMatchObject({ clientEventId: id, payload: { roleplayId: id } });
      sentCompletion = true;
      return route.fulfill({ json: { rejected: [] } });
    });

    await page.getByRole("article", { name: "À voix haute" }).getByRole("link", { name: "Ouvrir" }).click();
    await page.getByRole("link", { name: "Ouvrir le jeu de rôle" }).click();
    await page.getByRole("button", { name: /Commander au café/ }).click();
    await expect(page.getByText("8 tours au plus")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Démarrer" }).click();
    await page.getByRole("button", { name: "Traduire" }).click();
    await expect(page.getByText(opening.translation)).toBeVisible();

    const reply = page.getByRole("textbox", { name: "Ta réponse" });
    const first = "Vorrei un caffè, per piacere.";
    await reply.fill(first);
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByText("Tour 1 sur 8")).toBeVisible();
    await expect(reply).toHaveValue("");

    await page.emulateMedia({ colorScheme: "dark" });
    await page.getByRole("button", { name: "Dicter la réponse" }).click();
    await page.getByRole("button", { name: "Compris" }).click();
    await page.getByRole("button", { name: "Arrêter le micro" }).click();
    await expect(reply).toHaveValue(voiceText);
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByText("Tour 2 sur 8")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Tour 2 sur 8")).toBeVisible();
    const third = "Mi porta anche il conto quando può?";
    await reply.fill(third);
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByRole("heading", { name: "Partie terminée" })).toBeVisible();
    await expect(page.getByText("Boisson commandée.")).toBeVisible();
    await expect(page.getByText("+15 XP", { exact: true })).toBeVisible();
    expect(requests).toEqual([{ text: first, via: "typed" }, { text: voiceText, via: "speech" }, { text: third, via: "typed" }]);
    await expectNoHorizontalOverflow(page);
    await page.reload();
    await expect(page.getByText("+15 XP", { exact: true })).toBeVisible();
  } finally {
    await deleteTestUser(email);
  }
});
