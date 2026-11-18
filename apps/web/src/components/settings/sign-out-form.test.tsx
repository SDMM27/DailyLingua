// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const order: string[] = [];
const signOut = vi.fn(async () => void order.push("signOut"));
const deleteDatabase = vi.fn(async (userId: string) => void order.push(`delete:${userId}`));
vi.mock("@/app/actions/auth", () => ({ signOut: () => signOut() }));
vi.mock("@/lib/offline/session-packet-store", () => ({ deleteSessionPacketDatabase: (userId: string) => deleteDatabase(userId) }));

const { SignOutForm } = await import("./sign-out-form");

describe("SignOutForm", () => {
  it("deletes the packet database of the user, then signs out", async () => {
    render(
      <SignOutForm userId="user-1">
        <button type="submit">out</button>
      </SignOutForm>,
    );
    await userEvent.click(screen.getByRole("button", { name: "out" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(order).toEqual(["delete:user-1", "signOut"]);
  });
});
