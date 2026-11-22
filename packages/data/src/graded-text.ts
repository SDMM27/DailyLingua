import { z } from "zod";
import { appSchema, type AppClient } from "./client";
import { fetchAll, unwrap } from "./query";
import type { Json } from "./database.app.types";

const claimSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("claimed"), id: z.uuid() }),
  z.object({ status: z.enum(["busy", "quota"]) }),
]);

export interface GradedTextCell {
  language: string;
  level: string;
  density: number;
  theme: string;
  version: string;
}

export interface GradedTextPublication {
  title: string;
  body: string;
  word_count: number;
  new_words: Json[];
  grammar_point: string;
  writing_task: string;
  listening_segment: { from: number; to: number };
  model: string;
  checks: { review: "approved"; review_model: string };
}

export interface GradedTextItem {
  step: "reading" | "workshop";
  kind: "mcq" | "cloze" | "transform";
  position: number;
  prompt: Record<string, Json>;
  listening_only: boolean;
  answer: string;
  accept: string[];
}

export function createGradedTextStore(client: AppClient) {
  const db = appSchema(client);
  return {
    async claim(cell: GradedTextCell) {
      const result = await db.rpc("claim_graded_text_job", {
        p_language: cell.language, p_level: cell.level, p_density: cell.density, p_theme: cell.theme, p_version: cell.version,
      });
      return claimSchema.parse(unwrap(result));
    },
    async previousBodies(cell: GradedTextCell) {
      const rows = await fetchAll((start, end) => db.from("text").select("body")
        .eq("language", cell.language).eq("level_band", cell.level).eq("density", cell.density).eq("theme", cell.theme)
        .order("id").range(start, end));
      return rows.map(({ body }) => body);
    },
    async publish(jobId: string, text: GradedTextPublication, items: GradedTextItem[]): Promise<string> {
      const result = await db.rpc("publish_graded_text", {
        p_job: jobId, p_text: { ...text }, p_items: items.map((item) => ({ ...item })),
      });
      return z.uuid().parse(unwrap(result));
    },
    async fail(jobId: string, reason: string) {
      unwrap(await db.from("graded_text_job").update({ finished_at: new Date().toISOString(), failure: reason })
        .eq("id", jobId).is("finished_at", null).select("id").maybeSingle());
    },
  };
}

export type GradedTextStore = ReturnType<typeof createGradedTextStore>;
