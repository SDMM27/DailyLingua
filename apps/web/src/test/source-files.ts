import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const SRC_ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Source files of the app (tests and test helpers excluded) with the given extensions, as { path, text }. */
export function sourceFiles(extensions: readonly string[]): { path: string; text: string }[] {
  const found: { path: string; text: string }[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "test") visit(full);
      } else if (extensions.some((extension) => entry.name.endsWith(extension)) && !/\.test\.[tj]sx?$/.test(entry.name)) {
        found.push({ path: relative(SRC_ROOT, full).replaceAll("\\", "/"), text: readFileSync(full, "utf8") });
      }
    }
  };
  visit(SRC_ROOT);
  return found;
}
