// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackForm } from "./feedback-form";

const { sendFeedback } = vi.hoisted(() => ({ sendFeedback: vi.fn() }));
vi.mock("@/app/actions/feedback", () => ({ sendFeedback }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FeedbackForm", () => {
  it("sends the chosen category, the message and the page, then thanks the user", async () => {
    sendFeedback.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<FeedbackForm persist page="/mission" />);

    const send = screen.getByRole("button", { name: "Envoyer" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    await user.click(screen.getByRole("radio", { name: "Idée" }));
    await user.type(screen.getByLabelText("Ton message"), "Un mode sombre serait super");
    expect(screen.getByText("27 / 2000")).toBeTruthy();
    await user.click(send);

    expect(sendFeedback).toHaveBeenCalledWith({
      category: "idee",
      message: "Un mode sombre serait super",
      page: "/mission",
    });
    expect(await screen.findByText("Merci !")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Retour à l’accueil" }).getAttribute("href")).toBe("/");
  });

  it("keeps the message and shows the server error", async () => {
    sendFeedback.mockResolvedValue({
      ok: false,
      error: "Tu as envoyé beaucoup de retours aujourd’hui, réessaie demain.",
    });
    const user = userEvent.setup();
    render(<FeedbackForm persist />);
    await user.type(screen.getByLabelText("Ton message"), "Encore un bug");
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/beaucoup de retours/);
    expect((screen.getByLabelText("Ton message") as HTMLTextAreaElement).value).toBe("Encore un bug");
  });

  it("is disabled in the demo, with an explanation", () => {
    render(<FeedbackForm persist={false} />);
    expect(screen.getByText(/Mode démonstration/)).toBeTruthy();
    expect((screen.getByLabelText("Ton message") as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Envoyer" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
