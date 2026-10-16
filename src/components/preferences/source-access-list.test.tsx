// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PaidSource } from "@/lib/schemas/content";
import { SourceAccessList } from "./source-access-list";

const { setSourceAccess } = vi.hoisted(() => ({ setSourceAccess: vi.fn() }));
vi.mock("@/app/actions/preferences", () => ({ setSourceAccess }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const SOURCES: PaidSource[] = [
  { id: "s1", name: "Corriere", homepage: "https://corriere.example/", language: "it", access: "metered", declared: false },
  { id: "s2", name: "Kommersant", homepage: "https://kommersant.example/", language: "ru", access: "paywalled", declared: true },
];

const box = (name: string) => screen.getByRole("checkbox", { name: `J’y ai accès : ${name}` }) as HTMLInputElement;

describe("SourceAccessList", () => {
  it("shows one row per source with language, access label and the saved state", () => {
    render(<SourceAccessList sources={SOURCES} readOnly={false} />);
    expect(screen.getByText("Corriere")).toBeTruthy();
    expect(screen.getByText("Italien")).toBeTruthy();
    expect(screen.getByText("accès limité")).toBeTruthy();
    expect(screen.getByText("Russe")).toBeTruthy();
    expect(screen.getByText("payant")).toBeTruthy();
    expect(box("Corriere").checked).toBe(false);
    expect(box("Kommersant").checked).toBe(true);
  });

  it("saves a tick at once", async () => {
    setSourceAccess.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<SourceAccessList sources={SOURCES} readOnly={false} />);
    await user.click(box("Corriere"));
    expect(setSourceAccess).toHaveBeenCalledWith({ sourceId: "s1", hasAccess: true });
    expect(box("Corriere").checked).toBe(true);
    await user.click(box("Kommersant"));
    expect(setSourceAccess).toHaveBeenLastCalledWith({ sourceId: "s2", hasAccess: false });
    expect(box("Kommersant").checked).toBe(false);
  });

  it("reverts the box and says why when the save fails", async () => {
    setSourceAccess.mockResolvedValue({ ok: false, error: "Une erreur est survenue. Réessaie dans un instant." });
    const user = userEvent.setup();
    render(<SourceAccessList sources={SOURCES} readOnly={false} />);
    await user.click(box("Corriere"));
    expect(box("Corriere").checked).toBe(false);
    expect((await screen.findByRole("alert")).textContent).toBe("Une erreur est survenue. Réessaie dans un instant.");
  });

  it("reverts the box when the call itself throws", async () => {
    setSourceAccess.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    render(<SourceAccessList sources={SOURCES} readOnly={false} />);
    await user.click(box("Corriere"));
    expect(box("Corriere").checked).toBe(false);
    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  it("is read-only in the demo", async () => {
    const user = userEvent.setup();
    render(<SourceAccessList sources={SOURCES} readOnly />);
    expect(box("Corriere").disabled).toBe(true);
    await user.click(box("Corriere"));
    expect(setSourceAccess).not.toHaveBeenCalled();
  });

  it("renders nothing without paid sources", () => {
    const { container } = render(<SourceAccessList sources={[]} readOnly={false} />);
    expect(container.innerHTML).toBe("");
  });
});
