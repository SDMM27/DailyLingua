import type { Messages, UiLocale } from "@dailylingua/i18n";

// Typed message keys and locales for next-intl: French is the reference (see packages/i18n).
declare module "next-intl" {
  interface AppConfig {
    Locale: UiLocale;
    Messages: Messages;
  }
}
