import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(__dirname, "../..");
const CLIENT_ENTRIES = [
  "components/assessment/assessment-runner.tsx",
  "components/assessment/assessment-profile.tsx",
  "components/assessment/assessment-invite-card.tsx",
  "components/assessment/start-assessment-button.tsx",
  "components/assessment/listening-player.tsx",
  "components/assessment/draft-script.tsx",
  "components/placement/placement-test.tsx",
];
/** Modules that hold, or lead to, the dossiers with their scripts and reference answers. */
const FORBIDDEN = [/^lib\/assessment\/dossiers(\/|$)/, /^lib\/assessment\/policy$/, /^lib\/assessment\/public-dossier$/, /^lib\/assessment\/grade-assessment$/, /^lib\/assessment\/supabase-store$/];

/** Resolves an import specifier to a file under src, or null (package, type-only). */
function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? join(SRC, spec.slice(2)) : spec.startsWith(".") ? resolve(from, "..", spec) : null;
  if (!base) return null;
  return [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), base].find((c) => existsSync(c) && /\.tsx?$/.test(c)) ?? null;
}

/** Runtime imports of a file (`import type` is erased by the compiler, so it is not followed). */
function runtimeImports(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const found: string[] = [];
  for (const m of source.matchAll(/^[ \t]*(?:import|export)\s+(type\s+)?([^;]*?)\s+from\s+["']([^"']+)["']/gm)) {
    if (m[1]) continue;
    found.push(m[3]);
  }
  for (const m of source.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) found.push(m[1]);
  return found;
}

function reachable(entry: string): string[] {
  const seen = new Set<string>();
  const todo = [join(SRC, entry)];
  while (todo.length > 0) {
    const file = todo.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    // A "use server" module is replaced by a stub that calls the server: its imports never reach the browser.
    if (/^\s*["']use server["']/.test(readFileSync(file, "utf8"))) continue;
    for (const spec of runtimeImports(file)) {
      const target = resolveImport(file, spec);
      if (target) todo.push(target);
    }
  }
  return [...seen].map((f) => f.slice(SRC.length + 1).replaceAll("\\", "/").replace(/\.tsx?$/, "").replace(/\/index$/, ""));
}

describe("client components and the dossiers", () => {
  it.each(CLIENT_ENTRIES)("%s reaches no module holding a script or a reference answer", (entry) => {
    const modules = reachable(entry);
    expect(modules.length).toBeGreaterThan(0);
    const leaks = modules.filter((m) => FORBIDDEN.some((re) => re.test(m)));
    expect(leaks).toEqual([]);
  });

  it("the walk does see imports (a known path is reached)", () => {
    expect(reachable("components/assessment/assessment-runner.tsx")).toContain("lib/domain/assessment");
  });
});
