// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DraftScript } from "./draft-script";

afterEach(cleanup);

describe("DraftScript", () => {
  it("shows the script under a draft banner", () => {
    render(<DraftScript script="Al parco i bambini corrono." />);
    expect(screen.getByRole("note").textContent).toBe("Brouillon : pas encore enregistré");
    expect(screen.getByText("Al parco i bambini corrono.")).toBeTruthy();
  });
});
