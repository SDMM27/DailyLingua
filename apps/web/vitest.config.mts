import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: [fileURLToPath(new URL("./src/test/setup.ts", import.meta.url))],
  },
});
