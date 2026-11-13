// @vitest-environment jsdom
import { loadMessages } from "@dailylingua/i18n";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { targetLanguageOptions, type LanguageOption } from "@/lib/languages";

const completeOnboarding = vi.fn();
vi.mock("@/app/actions/onboarding", () => ({ completeOnboarding: (input: unknown) => completeOnboarding(input) }));

const { OnboardingWizard } = await import("./onboarding-wizard");

const messages = await loadMessages("fr");
const nativeOptions: LanguageOption[] = [
  { code: "ar", name: "arabe" },
  { code: "en", name: "anglais" },
  { code: "fr", name: "français" },
  { code: "it", name: "italien" },
];

function renderWizard(defaultNative = "fr") {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <OnboardingWizard nativeOptions={nativeOptions} targetOptions={targetLanguageOptions("fr")} defaultNative={defaultNative} />
    </NextIntlClientProvider>,
  );
}

const next = () => screen.getByRole("button", { name: "Continuer" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OnboardingWizard", () => {
  it("starts on the mother tongue, preselected, with progress 1 of 4", () => {
    renderWizard();
    expect(screen.getByRole("heading", { level: 1, name: "Ta langue maternelle" })).toBeTruthy();
    expect((screen.getByRole("radio", { name: "français" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("progressbar", { name: "Étape 1 sur 4" }).getAttribute("aria-valuenow")).toBe("1");
    // No « back » on the first screen.
    expect(screen.queryByRole("button", { name: "Retour" })).toBeNull();
  });

  it("filters the languages with the search field, ignoring accents", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.type(screen.getByRole("searchbox", { name: "Chercher une langue" }), "FRANCAIS");
    expect(screen.getAllByRole("radio").map((radio) => (radio as HTMLInputElement).value)).toEqual(["fr"]);
    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("Aucune langue ne correspond.")).toBeTruthy();
  });

  it("does not offer the mother tongue as the language to learn, and needs a choice to continue", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(next());
    expect(screen.getByRole("heading", { level: 1, name: "La langue que tu apprends" })).toBeTruthy();
    const values = screen.getAllByRole("radio").map((radio) => (radio as HTMLInputElement).value);
    expect(values).not.toContain("fr");
    expect(values).toContain("it");
    expect((next() as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("radio", { name: /italien/ }));
    expect((next() as HTMLButtonElement).disabled).toBe(false);
  });

  it("lists A0 to C2 with their descriptions as the starting level", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(next());
    await user.click(screen.getByRole("radio", { name: /italien/ }));
    await user.click(next());
    expect(screen.getByRole("heading", { level: 1, name: "Ton niveau de départ" })).toBeTruthy();
    expect(screen.getAllByRole("radio").map((radio) => (radio as HTMLInputElement).value)).toEqual(["A0", "A1", "A2", "B1", "B2", "C1", "C2"]);
    expect(screen.getByRole("radio", { name: /Je débute/ })).toBeTruthy();
    expect((next() as HTMLButtonElement).disabled).toBe(true);
  });

  it("offers 10, 15, 20 and 30 minutes with 15 preselected, and keeps the answers when going back", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(next());
    await user.click(screen.getByRole("radio", { name: /italien/ }));
    await user.click(next());
    await user.click(screen.getByRole("radio", { name: /B1/ }));
    await user.click(next());
    expect(screen.getByRole("heading", { level: 1, name: "Ton temps par jour" })).toBeTruthy();
    expect(screen.getAllByRole("radio").map((radio) => (radio as HTMLInputElement).value)).toEqual(["10", "15", "20", "30"]);
    expect((screen.getByRole("radio", { name: "15 minutes par jour" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("button", { name: "Commencer" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Retour" }));
    expect((screen.getByRole("radio", { name: /B1/ }) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole("button", { name: "Retour" }));
    expect((screen.getByRole("radio", { name: /italien/ }) as HTMLInputElement).checked).toBe(true);
  });

  it("sends the four answers and the browser time zone at the end", async () => {
    const user = userEvent.setup();
    completeOnboarding.mockResolvedValue(undefined); // the real action redirects and never returns
    renderWizard();
    await user.click(next());
    await user.click(screen.getByRole("radio", { name: /italien/ }));
    await user.click(next());
    await user.click(screen.getByRole("radio", { name: /Je débute/ }));
    await user.click(next());
    await user.click(screen.getByRole("radio", { name: "30 minutes par jour" }));
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(1));
    expect(completeOnboarding).toHaveBeenCalledWith({
      nativeLanguage: "fr",
      targetLanguage: "it",
      startLevel: "A0",
      dailyMinutes: 30,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  });

  it("shows a clear message and loses nothing when the save fails", async () => {
    const user = userEvent.setup();
    completeOnboarding.mockResolvedValue({ error: "generic" });
    renderWizard();
    await user.click(next());
    await user.click(screen.getByRole("radio", { name: /italien/ }));
    await user.click(next());
    await user.click(screen.getByRole("radio", { name: /A2/ }));
    await user.click(next());
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(messages.errors.generic)).toBeTruthy();
    // Still on the last step, the choices intact, and the button usable again to retry.
    expect((screen.getByRole("radio", { name: "15 minutes par jour" }) as HTMLInputElement).checked).toBe(true);
    await waitFor(() => expect((screen.getByRole("button", { name: "Commencer" }) as HTMLButtonElement).disabled).toBe(false));
  });

  it("clears the language to learn when the new mother tongue is that language", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(next());
    await user.click(screen.getByRole("radio", { name: /italien/ }));
    await user.click(screen.getByRole("button", { name: "Retour" }));
    await user.click(screen.getByRole("radio", { name: "italien" }));
    await user.click(next());
    expect(screen.queryByRole("radio", { name: /^italien/ })).toBeNull();
    expect((next() as HTMLButtonElement).disabled).toBe(true);
  });
});
