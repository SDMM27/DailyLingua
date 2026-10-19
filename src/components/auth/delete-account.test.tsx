// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteAccount } from "./delete-account";

vi.mock("@/app/actions/auth", () => ({ deleteAccount: vi.fn() }));

afterEach(cleanup);

describe("DeleteAccount", () => {
  it("only enables the deletion once the e-mail address is typed", async () => {
    const user = userEvent.setup();
    render(<DeleteAccount email="Moi@Example.com" />);
    await user.click(screen.getByRole("button", { name: "Supprimer mon compte…" }));

    const confirm = screen.getByRole("button", { name: "Supprimer définitivement" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    await user.type(screen.getByLabelText("Ton adresse e-mail pour confirmer"), "autre@example.com");
    expect(confirm.disabled).toBe(true);

    await user.clear(screen.getByLabelText("Ton adresse e-mail pour confirmer"));
    await user.type(screen.getByLabelText("Ton adresse e-mail pour confirmer"), "moi@example.com");
    expect(confirm.disabled).toBe(false);
  });

  it("asks a guest, who has no e-mail address, to type « supprimer »", async () => {
    const user = userEvent.setup();
    render(<DeleteAccount email={null} />);
    await user.click(screen.getByRole("button", { name: "Supprimer mon compte…" }));

    const confirm = screen.getByRole("button", { name: "Supprimer définitivement" }) as HTMLButtonElement;
    const field = screen.getByLabelText("Le mot « supprimer » pour confirmer");
    await user.type(field, "oui");
    expect(confirm.disabled).toBe(true);
    await user.clear(field);
    await user.type(field, " Supprimer");
    expect(confirm.disabled).toBe(false);
  });
});
