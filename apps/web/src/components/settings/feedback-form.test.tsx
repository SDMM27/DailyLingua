// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import fr from "../../../../../packages/i18n/messages/fr.json";
import type { FeedbackState } from "@/app/actions/feedback";

const sendFeedbackAction = vi.fn<(previous: FeedbackState, formData: FormData) => Promise<FeedbackState>>();
vi.mock("@/app/actions/feedback", () => ({ sendFeedbackAction: (p: FeedbackState, f: FormData) => sendFeedbackAction(p, f) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/settings" }));

const { FeedbackForm } = await import("./feedback-form");

function renderForm() {
  return render(
    <NextIntlClientProvider locale="fr" messages={fr}>
      <FeedbackForm />
    </NextIntlClientProvider>,
  );
}

describe("FeedbackForm", () => {
  it("sends the category, the message and the current page, then confirms and empties the field", async () => {
    sendFeedbackAction.mockImplementation(async (previous) => ({ attempt: previous.attempt + 1, sent: true }));
    renderForm();
    await userEvent.selectOptions(screen.getByLabelText("Type de retour"), "contenu");
    await userEvent.type(screen.getByLabelText("Ton message"), "Une faute dans la leçon");
    await userEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Merci, ton retour est bien envoyé."));
    const formData = sendFeedbackAction.mock.calls[0]![1];
    expect(formData.get("category")).toBe("contenu");
    expect(formData.get("message")).toBe("Une faute dans la leçon");
    expect(formData.get("page")).toBe("/settings");
    expect((screen.getByLabelText("Ton message") as HTMLTextAreaElement).value).toBe("");
  });

  it("shows a translated error and keeps what was typed", async () => {
    sendFeedbackAction.mockImplementation(async (previous, formData) => ({
      attempt: previous.attempt + 1,
      error: "tooManyRequests",
      category: String(formData.get("category")),
      message: String(formData.get("message")),
    }));
    renderForm();
    await userEvent.type(screen.getByLabelText("Ton message"), "Encore un retour");
    await userEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Trop de tentatives"));
    expect((screen.getByLabelText("Ton message") as HTMLTextAreaElement).value).toBe("Encore un retour");
  });
});
