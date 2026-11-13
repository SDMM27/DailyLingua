import { describe, expect, it } from "vitest";
import { z } from "zod";
import { jsonSchemaFormat } from "./output-format";

describe("jsonSchemaFormat", () => {
  const schema = z.object({
    category: z.enum(["grammar", "spelling"]).describe("Kind of error"),
    score: z.number().int(),
  });

  it("builds a json_schema format from a Zod schema", () => {
    const format = jsonSchemaFormat(schema);
    expect(format.type).toBe("json_schema");
    expect(format.schema).toMatchObject({ type: "object", properties: { score: { type: "integer" } } });
  });

  it("puts enums back in the schema so the API constrains the output to the list", () => {
    const properties = (jsonSchemaFormat(schema).schema as { properties: Record<string, { enum?: string[]; description?: string }> }).properties;
    expect(properties.category?.enum).toEqual(["grammar", "spelling"]);
    expect(properties.category?.description).toBe("Kind of error");
  });

  it("builds the format once per schema", () => {
    expect(jsonSchemaFormat(schema)).toBe(jsonSchemaFormat(schema));
  });
});
