import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Import boundaries of the domain packages. The same rules are in `packages/eslint.base.mjs`, but a
 * lint rule can be switched off with a comment: this test cannot.
 */

const PACKAGES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const THIS_FILE = fileURLToPath(import.meta.url);

const PACKAGES = ["schemas", "core", "i18n", "data", "ai"] as const;
type PackageName = (typeof PACKAGES)[number];

/** Packages a domain package must never depend on, by name (exact or as a `name/…` subpath). */
const FORBIDDEN_NAMES = ["react", "react-dom", "next", "next-intl", "server-only"];
const FORBIDDEN_SCOPES = ["@supabase/", "@anthropic-ai/"];
/**
 * Scopes a package may use although they are forbidden elsewhere: `data` is the one that talks to
 * Supabase, `ai` the one that calls the Anthropic SDK.
 */
const ALLOWED_SCOPES: Record<PackageName, string[]> = {
  schemas: [],
  core: [],
  i18n: [],
  data: ["@supabase/"],
  ai: ["@anthropic-ai/"],
};
/**
 * Extra rules: `schemas` is the bottom layer and must not import `core`; `i18n`, `data` and `ai` stand
 * alone (`data` may import the types of `ai`, to implement its store; `ai` never imports `data`).
 */
const FORBIDDEN_BY_PACKAGE: Record<PackageName, string[]> = {
  schemas: ["@dailylingua/core", "@dailylingua/ai"],
  core: ["@dailylingua/ai"],
  i18n: ["@dailylingua/core", "@dailylingua/schemas", "@dailylingua/data", "@dailylingua/ai"],
  data: ["@dailylingua/core", "@dailylingua/i18n"],
  ai: ["@dailylingua/core", "@dailylingua/i18n", "@dailylingua/data"],
};

/** Module specifiers imported by `source`: static, side-effect, re-export, dynamic and `require`. */
function importedSpecifiers(source: string): string[] {
  const patterns = [
    /\b(?:import|export)\b[^"'`;]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  return patterns.flatMap((pattern) => Array.from(source.matchAll(pattern), (match) => match[1] as string));
}

/** Why `specifier`, imported from `file` of package `pkg`, is forbidden, or null when it is allowed. */
function violation(specifier: string, file: string, pkg: PackageName): string | null {
  const named = (name: string) => specifier === name || specifier.startsWith(`${name}/`);
  if (FORBIDDEN_NAMES.some(named)) return "UI framework or server runtime";
  if (FORBIDDEN_SCOPES.some((scope) => specifier.startsWith(scope) && !ALLOWED_SCOPES[pkg].includes(scope))) {
    return "backend or AI SDK";
  }
  if (specifier.startsWith("@/")) return "legacy app alias";
  if (FORBIDDEN_BY_PACKAGE[pkg].some(named)) return `${pkg} must not import this package`;
  if (specifier.startsWith(".")) {
    const target = resolve(dirname(file), specifier);
    const own = join(PACKAGES_DIR, pkg) + sep;
    if (!(target + sep).startsWith(own)) return "relative import leaving the package (legacy src or another package)";
  }
  return null;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : sourceFiles(path);
    return /\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/.test(entry.name) ? [path] : [];
  });
}

/** Environment reads: `packages/data` and `packages/ai` receive their client or keys and never read variables (integration test excepted). */
const ENV_READ = /\bprocess\s*\.\s*env\b|\bimport\.meta\.env\b|\bprocess\s*\.\s*loadEnvFile\b/;
const ENV_ALLOWED = /\.integration\.test\.ts$/;

describe("scanner", () => {
  it("finds every import form", () => {
    const source = [
      'import a from "one";',
      'import { b } from "two";',
      'import type { C } from "three";',
      'export * from "four";',
      'export { d } from "five";',
      'import "six";',
      'const e = await import("seven");',
      'const f = require("eight");',
      "import {",
      "  g,",
      '} from "nine";',
    ].join("\n");
    expect(importedSpecifiers(source).sort()).toEqual(
      ["eight", "five", "four", "nine", "one", "seven", "six", "three", "two"].sort(),
    );
  });

  it("flags what is forbidden and only that", () => {
    const file = join(PACKAGES_DIR, "core", "src", "x.ts");
    for (const bad of ["react", "react-dom", "react/jsx-runtime", "next", "next/headers", "server-only", "@supabase/ssr", "@anthropic-ai/sdk", "@/lib/x", "../../src/lib/x", "../../../src/x"]) {
      expect(violation(bad, file, "core"), bad).not.toBeNull();
    }
    for (const good of ["zod", "ts-fsrs", "node:fs", "@dailylingua/schemas", "./dates", "./memory/fsrs", "../dates", "next-tick"]) {
      expect(violation(good, file, "core"), good).toBeNull();
    }
  });

  it("lets only data use Supabase, and keeps i18n and data free of next-intl", () => {
    const data = join(PACKAGES_DIR, "data", "src", "x.ts");
    expect(violation("@supabase/supabase-js", data, "data")).toBeNull();
    expect(violation("@supabase/ssr", join(PACKAGES_DIR, "i18n", "src", "x.ts"), "i18n")).not.toBeNull();
    expect(violation("next-intl", data, "data")).not.toBeNull();
    expect(violation("next-intl/server", join(PACKAGES_DIR, "i18n", "src", "x.ts"), "i18n")).not.toBeNull();
    expect(violation("@dailylingua/i18n", data, "data")).not.toBeNull();
  });

  it("lets only ai use the Anthropic SDK, and keeps it away from Supabase and from data", () => {
    const ai = join(PACKAGES_DIR, "ai", "src", "x.ts");
    expect(violation("@anthropic-ai/sdk", ai, "ai")).toBeNull();
    expect(violation("@anthropic-ai/sdk/helpers/zod", ai, "ai")).toBeNull();
    expect(violation("@anthropic-ai/sdk", join(PACKAGES_DIR, "data", "src", "x.ts"), "data")).not.toBeNull();
    expect(violation("@supabase/supabase-js", ai, "ai")).not.toBeNull();
    expect(violation("@dailylingua/data", ai, "ai")).not.toBeNull();
    expect(violation("react", ai, "ai")).not.toBeNull();
    expect(violation("next/server", ai, "ai")).not.toBeNull();
    // data implements the store of ai: it may import its types.
    expect(violation("@dailylingua/ai", join(PACKAGES_DIR, "data", "src", "x.ts"), "data")).toBeNull();
  });

  it("spots environment reads", () => {
    expect(ENV_READ.test("const a = process.env.X;")).toBe(true);
    expect(ENV_READ.test("process.loadEnvFile('.env')")).toBe(true);
    expect(ENV_READ.test("const processor = 1;")).toBe(false);
  });

  it("forbids schemas from importing core", () => {
    const file = join(PACKAGES_DIR, "schemas", "src", "x.ts");
    expect(violation("@dailylingua/core", file, "schemas")).not.toBeNull();
    expect(violation("@dailylingua/core", join(PACKAGES_DIR, "core", "src", "x.ts"), "core")).toBeNull();
  });
});

describe.each(PACKAGES)("%s boundaries", (pkg) => {
  const files = sourceFiles(join(PACKAGES_DIR, pkg, "src")).filter((file) => file !== THIS_FILE);

  it("has sources to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("imports nothing forbidden", () => {
    const found = files.flatMap((file) =>
      importedSpecifiers(readFileSync(file, "utf8"))
        .map((specifier) => ({ file: relative(PACKAGES_DIR, file), specifier, why: violation(specifier, file, pkg) }))
        .filter((item) => item.why !== null),
    );
    expect(found).toEqual([]);
  });

  it("declares no forbidden dependency", () => {
    const manifest = JSON.parse(readFileSync(join(PACKAGES_DIR, pkg, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const declared = Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies });
    const bad = declared.filter((name) => violation(name, join(PACKAGES_DIR, pkg, "src", "x.ts"), pkg) !== null);
    expect(bad).toEqual([]);
  });

  it.runIf(pkg === "data" || pkg === "ai")("reads no environment variable outside its integration test", () => {
    const found = files
      .filter((file) => !ENV_ALLOWED.test(file) && ENV_READ.test(readFileSync(file, "utf8")))
      .map((file) => relative(PACKAGES_DIR, file));
    expect(found).toEqual([]);
  });
});
