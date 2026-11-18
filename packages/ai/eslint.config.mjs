import { domainConfig } from "../eslint.base.mjs";

// The ai package is the one that calls the Anthropic SDK. It never knows Supabase: its store is injected.
export default domainConfig({
  allowAnthropic: true,
  extraPatterns: [
    { group: ["@dailylingua/data"], message: "The ai package receives its store: it must not import packages/data." },
  ],
});
