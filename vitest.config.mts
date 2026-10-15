import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // `server-only` throws outside Next's server bundle; tests run on the server anyway.
      "server-only": fromRoot("./src/test/server-only.ts"),
    },
  },
  test: {
    // The integration tests share one local database, and the content one retires every keyed source
    // it does not know (including other tests' throw-away sources): files must not overlap.
    fileParallelism: false,
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: [fromRoot("./src/test/setup-env.ts")],
  },
});
