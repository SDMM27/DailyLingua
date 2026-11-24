// @vitest-environment jsdom
import { scriptFixtureUnit } from "@dailylingua/content/fixtures";
import { loadMessages } from "@dailylingua/i18n";
import { unitSchema, type ScriptUnit } from "@dailylingua/schemas";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { LettersStep } from "./letters-step";
import { ScriptInfo, scriptHasInfo } from "./script-info";
import { WordsStep } from "./words-step";

const messages = await loadMessages("fr");

function scriptUnit(): ScriptUnit {
  const source = scriptFixtureUnit();
  // The second letter becomes a false friend, to see its warning.
  const letters = source.letters.map((letter) => (letter.lower === "к" ? { ...letter, kind: "false-friend" as const, lookalike: "k" } : letter));
  const parsed = unitSchema.parse({ ...source, letters });
  if (parsed.kind !== "script") throw new Error("expected a writing unit");
  return { ...parsed, version: "0123456789ab" };
}

const wrap = (node: React.ReactNode) => <NextIntlClientProvider locale="fr" messages={messages}>{node}</NextIntlClientProvider>;

describe("writing-unit steps", () => {
  it("opens an information screen for the letters and the words only", () => {
    expect(["letters", "words"].every((step) => scriptHasInfo(step as never))).toBe(true);
    expect(["sounds", "reading", "test"].some((step) => scriptHasInfo(step as never))).toBe(false);
  });

  it("shows the letters one at a time, warns about a false friend and ends on the last one", async () => {
    const user = userEvent.setup();
    const onFinished = vi.fn();
    const unit = scriptUnit();
    render(wrap(<LettersStep unit={unit} locale="fr" onFinished={onFinished} />));
    expect(screen.getByText("Lettre 1 sur 6")).toBeTruthy();
    expect(screen.getByText("А")).toBeTruthy();
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.queryByRole("button", { name: "Lettre précédente" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Lettre suivante" }));
    expect(screen.getByText("Lettre 2 sur 6")).toBeTruthy();
    expect(screen.getByRole("note").textContent).toContain("« k »");
    expect(screen.getByRole("button", { name: "Écouter le mot кот" }).getAttribute("aria-disabled")).toBe("true");

    await user.click(screen.getByRole("button", { name: "Lettre précédente" }));
    expect(screen.getByText("Lettre 1 sur 6")).toBeTruthy();
    for (let i = 0; i < 5; i += 1) await user.click(screen.getByRole("button", { name: "Lettre suivante" }));
    expect(screen.getByText("Lettre 6 sur 6")).toBeTruthy();
    expect(onFinished).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("reveals the reading and the meaning of a word on a tap, and hides them on a second one", async () => {
    const user = userEvent.setup();
    const onFinished = vi.fn();
    render(wrap(<WordsStep unit={scriptUnit()} locale="fr" onFinished={onFinished} />));
    const toggle = screen.getByRole("button", { name: "кот : voir la lecture et le sens" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("kot")).toBeNull();
    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("kot")).toBeTruthy();
    expect(screen.getByText(/chat/)).toBeTruthy();
    await user.click(toggle);
    expect(screen.queryByText("kot")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("routes a step to its screen, and renders nothing for a step without one", () => {
    const unit = scriptUnit();
    const { container, rerender } = render(wrap(<ScriptInfo unit={unit} step="sounds" locale="fr" onFinished={vi.fn()} />));
    expect(container.textContent).toBe("");
    rerender(wrap(<ScriptInfo unit={unit} step="words" locale="fr" onFinished={vi.fn()} />));
    expect(screen.getByRole("button", { name: "кот : voir la lecture et le sens" })).toBeTruthy();
  });
});
