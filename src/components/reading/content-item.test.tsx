// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { ContentListItem } from "@/lib/schemas/content";
import { ContentItem } from "./content-item";

afterEach(cleanup);

const NOW = new Date("2026-10-13T10:00:00Z");

const ITEM: ContentListItem = {
  id: "c1",
  language: "ar",
  type: "article",
  title: "عنوان المقال",
  url: "https://www.bbc.com/arabic/articles/c1",
  difficulty: "B2",
  durationMinutes: 5,
  summary: "ملخص قصير للمقال.",
  publishedAt: "2026-10-13T07:00:00Z",
  source: {
    key: "bbc-ar",
    name: "بي بي سي عربي",
    homepage: "https://www.bbc.com/arabic",
    access: "metered",
    license: { kind: "all-rights-reserved", name: "Tous droits réservés", termsUrl: "https://www.bbc.co.uk/news/10628494" },
  },
};

describe("ContentItem", () => {
  it("links to the publisher in a new tab, with the language and direction of the text", () => {
    render(<ContentItem item={ITEM} now={NOW} timeZone="Europe/Paris" />);
    const link = screen.getByRole("link", { name: /عنوان المقال/ });
    expect(link).toHaveProperty("href", ITEM.url);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("lang")).toBe("ar");
    expect(link.getAttribute("dir")).toBe("rtl");
    expect(screen.getByText(ITEM.summary).getAttribute("dir")).toBe("rtl");
  });

  it("credits the source with its licence, date, level, duration and access", () => {
    render(<ContentItem item={ITEM} now={NOW} timeZone="Europe/Paris" />);
    expect(screen.getByText(/بي بي سي عربي/)).toBeTruthy();
    expect(screen.getByText(/il y a 3 heures/)).toBeTruthy();
    expect(screen.getByText("B2")).toBeTruthy();
    expect(screen.getByText("≈ 5 min")).toBeTruthy();
    expect(screen.getByText("Abonnement possible")).toBeTruthy();
    const license = screen.getByRole("link", { name: "Tous droits réservés" });
    expect(license).toHaveProperty("href", "https://www.bbc.co.uk/news/10628494");
  });

  it("links an open licence to its text and hides a teaser identical to the title", () => {
    const open: ContentListItem = {
      ...ITEM,
      summary: ITEM.title,
      publishedAt: null,
      source: {
        ...ITEM.source,
        access: "free",
        license: {
          kind: "cc-by",
          name: "CC BY 3.0",
          url: "https://creativecommons.org/licenses/by/3.0/",
          termsUrl: "https://globalvoices.org/about/global-voices-attribution-policy/",
        },
      },
    };
    render(<ContentItem item={open} now={NOW} timeZone="Europe/Paris" />);
    expect(screen.getByRole("link", { name: "CC BY 3.0" })).toHaveProperty("href", "https://creativecommons.org/licenses/by/3.0/");
    expect(screen.getAllByText(ITEM.title)).toHaveLength(1);
    expect(screen.queryByText("Abonnement possible")).toBeNull();
  });

  it("offers « Regarder ici » for a YouTube video and loads no player until it is tapped", async () => {
    const video: ContentListItem = {
      ...ITEM,
      language: "de",
      type: "video",
      title: "Was machst du am Wochenende?",
      summary: "Wir fragen Leute auf der Straße.",
      url: "https://www.youtube.com/watch?v=abcdEFGhi_1",
    };
    const { container } = render(<ContentItem item={video} now={NOW} timeZone="Europe/Paris" />);
    expect(container.querySelector("iframe")).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Regarder ici" }));
    expect(container.querySelector("iframe")?.getAttribute("src")).toContain("youtube-nocookie.com/embed/abcdEFGhi_1");
    // The link to the publisher stays.
    expect(screen.getByRole("link", { name: /Was machst du/ })).toHaveProperty("href", video.url);
  });

  it("flags a channel explained in French and children's content, and nothing for a plain source", () => {
    const { rerender } = render(<ContentItem item={ITEM} now={NOW} timeZone="Europe/Paris" />);
    expect(screen.queryByText("Jeunesse")).toBeNull();
    expect(screen.queryByText(/Expliqué en/)).toBeNull();
    const video = { ...ITEM, type: "video" as const, url: "https://www.youtube.com/watch?v=abcdEFGhi_1" };
    rerender(<ContentItem item={{ ...video, source: { ...ITEM.source, key: "youtube-holamigo" } }} now={NOW} timeZone="Europe/Paris" />);
    expect(screen.getByText("Expliqué en français")).toBeTruthy();
    rerender(<ContentItem item={{ ...video, source: { ...ITEM.source, key: "youtube-slow-swedish-katrin" } }} now={NOW} timeZone="Europe/Paris" />);
    expect(screen.getByText("Expliqué en anglais")).toBeTruthy();
    rerender(<ContentItem item={{ ...video, source: { ...ITEM.source, key: "youtube-nos-jeugdjournaal" } }} now={NOW} timeZone="Europe/Paris" />);
    expect(screen.getByText("Jeunesse")).toBeTruthy();
  });

  it("offers « Écouter ici » for a podcast episode with an audio file only", () => {
    const podcast = { ...ITEM, type: "podcast" as const };
    render(<ContentItem item={podcast} now={NOW} timeZone="Europe/Paris" />);
    expect(screen.queryByRole("button", { name: "Écouter ici" })).toBeNull();
    cleanup();
    render(<ContentItem item={{ ...podcast, audioUrl: "https://cdn.example.net/1.mp3" }} now={NOW} timeZone="Europe/Paris" />);
    expect(screen.getByRole("button", { name: "Écouter ici" })).toBeTruthy();
  });

  it("has no player for an article or a video that is not a YouTube watch link", () => {
    render(<ContentItem item={ITEM} now={NOW} timeZone="Europe/Paris" />);
    expect(screen.queryByRole("button", { name: "Regarder ici" })).toBeNull();
    cleanup();
    render(<ContentItem item={{ ...ITEM, type: "video", url: "https://www.youtube.com/channel/UCbxb2fqe9oNgglAoYqsYOtQ" }} now={NOW} timeZone="Europe/Paris" />);
    expect(screen.queryByRole("button", { name: "Regarder ici" })).toBeNull();
  });
});
