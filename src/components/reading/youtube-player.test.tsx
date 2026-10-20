// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { YouTubePlayer } from "./youtube-player";

afterEach(cleanup);

describe("YouTubePlayer", () => {
  it("shows a facade without any iframe or image before the click", () => {
    const { container } = render(<YouTubePlayer videoId="abcdEFGhi_1" title="Was machst du?" language="de" />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Lue depuis YouTube")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lire la vidéo : Was machst du?" })).toBeTruthy();
  });

  it("loads the privacy-enhanced player after the click", async () => {
    const user = userEvent.setup();
    const { container } = render(<YouTubePlayer videoId="abcdEFGhi_1" title="Was machst du?" language="de" />);
    await user.click(screen.getByRole("button"));
    const frame = container.querySelector("iframe");
    expect(frame).not.toBeNull();
    expect(frame?.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/abcdEFGhi_1?autoplay=1&playsinline=1&rel=0&hl=fr&cc_lang_pref=de&cc_load_policy=1",
    );
    expect(frame?.getAttribute("title")).toBe("Was machst du?");
    expect(frame?.getAttribute("referrerpolicy")).toBe("strict-origin-when-cross-origin");
    expect(frame?.getAttribute("allow")).toContain("fullscreen");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("skips the facade when the learner already asked to watch", () => {
    const { container } = render(<YouTubePlayer videoId="abcdEFGhi_1" title="Was machst du?" language="de" startPlaying />);
    expect(container.querySelector("iframe")).not.toBeNull();
  });
});
