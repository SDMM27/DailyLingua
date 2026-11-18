import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { SECURITY_HEADERS } from "./src/lib/security/headers";

// In development, share the Supabase variables of the repository root (never printed). Elsewhere
// (CI, production) the environment provides them.
if (process.env.NODE_ENV === "development") {
  try {
    process.loadEnvFile(fileURLToPath(new URL("../../.env.local", import.meta.url)));
  } catch {
    // No .env.local: the variables come from the shell.
  }
}

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The workspace packages are shipped as TypeScript sources.
  transpilePackages: ["@dailylingua/core", "@dailylingua/data", "@dailylingua/i18n", "@dailylingua/schemas"],
  // node_modules is hoisted at the repository root, above this app.
  turbopack: { root: repositoryRoot },
  outputFileTracingRoot: repositoryRoot,
  devIndicators: { position: "top-right" },
  async headers() {
    return [{ source: "/:path*", headers: [...SECURITY_HEADERS] }];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
