import { domainConfig } from "../eslint.base.mjs";

export default domainConfig({
  extraPatterns: [{ group: ["@dailylingua/core", "@dailylingua/core/*"], message: "schemas must not import core." }],
});
