// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TurnstileWidget } from "./turnstile-widget";

// next/script is replaced by a stub that lets the test decide when the script is ready.
const script = vi.hoisted(() => ({ onReady: undefined as undefined | (() => void) }));
vi.mock("next/script", () => ({
  default: ({ onReady }: { onReady?: () => void }) => {
    script.onReady = onReady;
    return null;
  },
}));

const turnstile = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };

function load() {
  turnstile.render.mockReturnValue("widget-1");
  window.turnstile = turnstile;
  act(() => script.onReady?.());
  return turnstile.render.mock.calls[0][1] as { callback: (token: string) => void; "expired-callback": () => void };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  delete window.turnstile;
});

describe("TurnstileWidget", () => {
  it("renders the challenge in French once the script is ready", () => {
    render(<TurnstileWidget siteKey="site" />);
    load();
    expect(turnstile.render).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ sitekey: "site", language: "fr", size: "flexible" }),
    );
  });

  it("hands the token to the callback and to the hidden field, and clears it on expiry", () => {
    const onToken = vi.fn();
    const { container } = render(<TurnstileWidget siteKey="site" fieldName="captchaToken" onToken={onToken} />);
    const options = load();
    const field = container.querySelector<HTMLInputElement>('input[type="hidden"][name="captchaToken"]');
    expect(field?.value).toBe("");

    act(() => options.callback("tok"));
    expect(onToken).toHaveBeenLastCalledWith("tok");
    expect(field?.value).toBe("tok");

    act(() => options["expired-callback"]());
    expect(onToken).toHaveBeenLastCalledWith(null);
    expect(field?.value).toBe("");
  });

  it("writes no hidden field without a field name", () => {
    const { container } = render(<TurnstileWidget siteKey="site" />);
    expect(container.querySelector("input")).toBeNull();
  });

  it("asks for a new token when resetKey changes, not on mount", () => {
    const onToken = vi.fn();
    const { rerender } = render(<TurnstileWidget siteKey="site" onToken={onToken} resetKey={0} />);
    load();
    expect(turnstile.reset).not.toHaveBeenCalled();

    rerender(<TurnstileWidget siteKey="site" onToken={onToken} resetKey={1} />);
    expect(turnstile.reset).toHaveBeenCalledWith("widget-1");
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it("removes the widget when unmounted", () => {
    const { unmount } = render(<TurnstileWidget siteKey="site" />);
    load();
    unmount();
    expect(turnstile.remove).toHaveBeenCalledWith("widget-1");
  });
});
