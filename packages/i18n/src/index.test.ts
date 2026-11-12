import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { describe, expect, it } from "vitest";
import { defaultUiLocale, loadMessages, messageKeys, resolveUiLocale, uiLocales, type Messages } from "./index";

function flatten(messages: object, prefix = ""): [string, unknown][] {
  return Object.entries(messages).flatMap(([key, value]): [string, unknown][] => {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    return typeof value === "object" && value !== null ? flatten(value, path) : [[path, value]];
  });
}

/** Sorted names of the ICU arguments of a message, nested plural branches included. */
function variables(elements: MessageFormatElement[]): string[] {
  const names = new Set<string>();
  const visit = (nodes: MessageFormatElement[]) => {
    for (const node of nodes) {
      if (node.type === TYPE.pound || node.type === TYPE.literal) continue;
      names.add(node.value);
      if (node.type === TYPE.plural || node.type === TYPE.select) {
        for (const option of Object.values(node.options)) visit(option.value);
      }
    }
  };
  visit(elements);
  return [...names].sort();
}

const all = await Promise.all(uiLocales.map(async (locale) => [locale, await loadMessages(locale)] as const));
const reference = all[0]![1];

describe.each(all)("messages %s", (locale, messages) => {
  const entries = flatten(messages);

  it("has the same keys as the reference language", () => {
    expect(messageKeys(messages)).toEqual(messageKeys(reference));
  });

  it("has no empty value", () => {
    for (const [key, value] of entries) {
      expect(typeof value, `${locale}:${key}`).toBe("string");
      expect((value as string).trim(), `${locale}:${key}`).not.toBe("");
    }
  });

  it("is valid ICU MessageFormat with the reference variables", () => {
    const expected = new Map(flatten(reference).map(([key, value]) => [key, variables(parse(value as string))]));
    for (const [key, value] of entries) {
      expect(() => parse(value as string), `${locale}:${key}`).not.toThrow();
      expect(variables(parse(value as string)), `${locale}:${key}`).toEqual(expected.get(key));
    }
  });
});

it("has at least one plural and one interpolation", () => {
  const parsed = flatten(reference).map(([, value]) => parse(value as string));
  expect(parsed.some((nodes) => nodes.some((n) => n.type === TYPE.plural))).toBe(true);
  expect(parsed.some((nodes) => nodes.some((n) => n.type === TYPE.argument))).toBe(true);
});

it("uses a default locale that is available", () => {
  expect(uiLocales).toContain(defaultUiLocale);
});

describe("messageKeys", () => {
  it("flattens a nested tree in document order", () => {
    expect(messageKeys({ a: { b: "x", c: { d: "y" } }, e: "z" })).toEqual(["a.b", "a.c.d", "e"]);
  });

  it("types messages from the reference", () => {
    const check: Messages = reference;
    expect(check.common.appName).toBe("Daily Lingua");
  });
});

describe("resolveUiLocale", () => {
  it("honours the requested locale when available", () => {
    expect(resolveUiLocale("fr")).toBe("fr");
    expect(resolveUiLocale("en", "fr")).toBe("en");
  });

  it("reduces a regional tag to its language", () => {
    expect(resolveUiLocale("fr-CA")).toBe("fr");
    expect(resolveUiLocale("EN-gb")).toBe("en");
  });

  it("falls back to the first available language of the header", () => {
    expect(resolveUiLocale("de", "de, fr;q=0.8")).toBe("fr");
    expect(resolveUiLocale(null, "fr-CA,fr;q=0.9,en;q=0.5")).toBe("fr");
    expect(resolveUiLocale(undefined, "en;q=0.4, fr;q=0.9")).toBe("fr");
  });

  it("falls back to the default locale", () => {
    expect(resolveUiLocale("de")).toBe(defaultUiLocale);
    expect(resolveUiLocale(null, "de, ja;q=0.5, *;q=0.1")).toBe(defaultUiLocale);
    expect(resolveUiLocale(null, null)).toBe(defaultUiLocale);
    expect(resolveUiLocale("")).toBe(defaultUiLocale);
  });

  it("ignores zero-weight and malformed entries", () => {
    expect(resolveUiLocale(null, "fr;q=0, en")).toBe("en");
    expect(resolveUiLocale(null, "fr;q=abc, ,")).toBe(defaultUiLocale);
  });
});
