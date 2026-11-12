import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This app is self-contained: the legacy app at the repository root is a reference to copy
      // mechanisms from, never a dependency.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../src", "../../src/*", "../../../src", "../../../src/*", "../../../../src", "../../../../src/*"],
              message: "apps/web must not import from the legacy app (src/ at the repository root): copy the mechanism instead.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;
