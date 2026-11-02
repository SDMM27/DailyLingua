import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

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
    schema.enum = JSON.parse(match[1]);
    const description = (schema.description as string).slice(0, match.index);
    if (description) schema.description = description;
    else delete schema.description;
  }
  Object.values(schema).forEach(restoreEnums);
}

/**
 * `zodOutputFormat` with the enums enforced. The SDK turns `enum` into a hint in the description, so the
 * model can answer a value outside the list, and parsing then rejects the whole answer. Put back in the
 * schema, the API constrains the output to the list.
 */
export const strictOutputFormat: typeof zodOutputFormat = (schema) => {
  const format = zodOutputFormat(schema);
  restoreEnums(format.schema);
  return format;
};
