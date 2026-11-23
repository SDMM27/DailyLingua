import { domainConfig } from "../eslint.base.mjs";

export default domainConfig({
  extraPatterns: [{ group: ["@dailylingua/data", "@dailylingua/ai", "@dailylingua/i18n"], message: "content stays free of data, ai and i18n." }],
});
