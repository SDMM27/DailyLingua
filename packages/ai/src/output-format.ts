import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ZodType } from "zod";

/** How the SDK writes an enum it moved out of the schema, at the end of a description. */
const ENUM_IN_DESCRIPTION = /(?:\n\n)?\{enum: (\[[\s\S]*\])\}$/u;

function restoreEnums(node: unknown): void {
  if (Array.isArray(node)) {
    node.forEach(restoreEnums);
    return;
  }
  if (typeof node !== "object" || node === null) return;
  const schema = node as Record<string, unknown>;
  const match = typeof schema.description === "string" ? ENUM_IN_DESCRIPTION.exec(schema.description) : null;
  if (match) {
    schema.enum = JSON.parse(match[1] as string);
    const description = (schema.description as string).slice(0, match.index);
    if (description) schema.description = description;
    else delete schema.description;
  }
  Object.values(schema).forEach(restoreEnums);
}

export interface JsonSchemaFormat {
  type: "json_schema";
  schema: Record<string, unknown>;
}

const formats = new WeakMap<object, JsonSchemaFormat>();

/**
 * The `output_config.format` of a request for answers shaped like `schema`. The SDK turns a Zod
 * `enum` into a hint in the description, so the model could answer a value outside the list: put
 * back in the schema, the API constrains the output to the list. (Same fix as the app's
 * `strictOutputFormat`, copied rather than imported: this package never depends on the legacy app.)
 * The answer is parsed and validated by the gateway with `schema` itself, not by the SDK.
 */
export function jsonSchemaFormat(schema: ZodType): JsonSchemaFormat {
  let format = formats.get(schema);
  if (!format) {
    const built = zodOutputFormat(schema);
    restoreEnums(built.schema);
    format = { type: "json_schema", schema: built.schema };
    formats.set(schema, format);
  }
  return format;
}
