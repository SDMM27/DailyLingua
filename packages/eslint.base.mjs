import tseslint from "typescript-eslint";

/**
 * Import boundaries of the domain packages: no UI framework, no backend SDK, nothing from the
 * legacy app. The same rule is enforced by `core/src/boundaries.test.ts`, which cannot be bypassed
 * with an eslint-disable comment.
 */
const FORBIDDEN_PATHS = ["react", "react-dom", "next", "server-only"].map((name) => ({
  name,
  message: "Domain packages must stay free of UI frameworks and server runtimes.",
}));

const SUPABASE_PATTERN = {
  group: ["@supabase/*"],
  message: "Domain packages must not know Supabase: data access lives in packages/data.",
};

const FORBIDDEN_PATTERNS = [
  { group: ["react/*", "react-dom/*", "next/*"], message: "Domain packages must stay free of UI frameworks." },
  { group: ["@anthropic-ai/*"], message: "Domain packages must not call the Anthropic SDK: that lives in packages/ai." },
  { group: ["../../src", "../../src/*", "@/*"], message: "Domain packages must not import the legacy app." },
];

/**
 * @param {{ extraPatterns?: { group: string[], message: string }[], allowSupabase?: boolean }} [options]
 *   `allowSupabase` is for `packages/data` only, the one package that talks to the database.
 */
export function domainConfig({ extraPatterns = [], allowSupabase = false } = {}) {
  return tseslint.config(
    { ignores: ["node_modules/**"] },
    ...tseslint.configs.recommended,
    {
      rules: {
        "no-restricted-imports": [
          "error",
          { paths: FORBIDDEN_PATHS, patterns: [...FORBIDDEN_PATTERNS, ...(allowSupabase ? [] : [SUPABASE_PATTERN]), ...extraPatterns] },
        ],
      },
    },
  );
}
