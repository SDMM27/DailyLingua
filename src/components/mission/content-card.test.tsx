// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Content } from "@/lib/schemas/mission";
import { ContentCard } from "./content-card";

afterEach(cleanup);

const CONTENT: Content = {
  title: "Hola, ¿qué tal?",
  type: "video",
  language: "es",
  source: { name: "Holamigo", homepage: "https://www.youtube.com/channel/UCfY0B43ZgcN1ELb5e_yn5Kg" },
  url: "https://www.youtube.com/watch?v=abcdEFGhi_1",
  difficulty: "A1",
  durationMinutes: 8,
  summary: "Les premières phrases.",
  transcriptAvailable: false,
};

describe("ContentCard", () => {
  it("shows no trait pill for a source without traits", () => {
    render(<ContentCard content={CONTENT} />);
    expect(screen.queryByText(/Expliqué en/)).toBeNull();
    expect(screen.queryByText("Jeunesse")).toBeNull();
    cleanup();
    render(<ContentCard content={{ ...CONTENT, source: { ...CONTENT.source, traits: {} } }} />);
    expect(screen.queryByText(/Expliqué en/)).toBeNull();
  });

  it("flags a channel explained in French", () => {
    const traits = { instructionLanguage: "fr" } as const;
    render(<ContentCard content={{ ...CONTENT, source: { ...CONTENT.source, traits } }} />);
    expect(screen.getByText("Expliqué en français")).toBeTruthy();
  });

  it("offers to listen to a podcast that has an audio file, and not otherwise", () => {
    const podcast = { ...CONTENT, type: "podcast" as const, url: "https://www.example.es/podcast/1" };
    render(<ContentCard content={podcast} />);
    expect(screen.queryByRole("button", { name: "Écouter ici" })).toBeNull();
    cleanup();
    render(<ContentCard content={{ ...podcast, audioUrl: "https://cdn.example.es/1.mp3" }} />);
    expect(screen.getByRole("button", { name: "Écouter ici" })).toBeTruthy();
  });

  it("flags children's content", () => {
    const traits = { audience: "children" } as const;
    render(<ContentCard content={{ ...CONTENT, source: { ...CONTENT.source, traits } }} />);
    expect(screen.getByText("Jeunesse")).toBeTruthy();
  });
});
