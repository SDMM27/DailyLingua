import { describe, expect, it } from "vitest";
import { z } from "zod";
import { wireAssessmentGradingSchema } from "@/lib/schemas/assessment";
import { wireContentTopicsSchema } from "@/lib/schemas/content-topics";
import { TOPICS } from "@/lib/schemas/preferences";
import { wireWritingFeedbackSchema } from "@/lib/schemas/writing-feedback";
import { strictOutputFormat } from "./output-format";

/** Every `enum` of a schema, and whether a hint is left in a description. */
function scan(node: unknown, found: { enums: unknown[][]; hints: number } = { enums: [], hints: 0 }) {
  if (Array.isArray(node)) node.forEach((n) => scan(n, found));
  else if (typeof node === "object" && node !== null) {
    const schema = node as Record<string, unknown>;
    if (Array.isArray(schema.enum)) found.enums.push(schema.enum);
    if (typeof schema.description === "string" && schema.description.includes("{enum:")) found.hints += 1;
    Object.values(schema).forEach((n) => scan(n, found));
  }
  return found;
}

describe("strictOutputFormat", () => {
  it("puts the enum back in the schema and keeps the description", () => {
    const { schema } = strictOutputFormat(z.object({ a: z.enum(["é", "y"]).describe("Pick one."), b: z.enum(["x"]) }));
    const properties = schema.properties as Record<string, Record<string, unknown>>;
    expect(properties.a).toEqual({ type: "string", enum: ["é", "y"], description: "Pick one." });
    expect(properties.b).toEqual({ type: "string", enum: ["x"] });
  });

  it("reaches arrays, nullable fields and shared definitions", () => {
    const shared = z.enum(["a", "b"]);
    const found = scan(strictOutputFormat(z.object({ list: z.array(shared), other: shared, opt: shared.nullable() })).schema);
    expect(found.hints).toBe(0);
    expect(found.enums.length).toBeGreaterThan(0);
  });

  it("still parses with the zod schema", () => {
    const format = strictOutputFormat(z.object({ a: z.enum(["x"]) }));
    expect(format.parse('{"a":"x"}')).toEqual({ a: "x" });
    expect(() => format.parse('{"a":"z"}')).toThrow();
  });

  it("enforces the lists of the app's answers", () => {
    const topics = scan(strictOutputFormat(wireContentTopicsSchema).schema);
    expect(topics.hints).toBe(0);
    expect(topics.enums).toContainEqual([...TOPICS]);
    for (const schema of [wireAssessmentGradingSchema, wireWritingFeedbackSchema]) {
      const found = scan(strictOutputFormat(schema).schema);
      expect(found.hints).toBe(0);
      expect(found.enums.length).toBeGreaterThan(0);
    }
  });
});
