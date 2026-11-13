import { describe, expect, it } from "vitest";
import { pickUiLocale } from "./locale";

describe("pickUiLocale", () => {
  it("prefers the profile over the cookie and the browser", () => {
    expect(pickUiLocale({ profileLocale: "en", cookieLocale: "fr", acceptLanguage: "fr-FR" })).toBe("en");
  });

  it("falls back to the cookie when there is no usable profile language", () => {
    expect(pickUiLocale({ profileLocale: null, cookieLocale: "fr", acceptLanguage: "en-US" })).toBe("fr");
    // A profile language the app does not translate is skipped, not turned into English.
    expect(pickUiLocale({ profileLocale: "ar", cookieLocale: "fr", acceptLanguage: "en-US" })).toBe("fr");
  });

  it("falls back to Accept-Language, most preferred first", () => {
    expect(pickUiLocale({ acceptLanguage: "de;q=0.9, fr-CA;q=0.8, en;q=0.5" })).toBe("fr");
    expect(pickUiLocale({ cookieLocale: "xx", acceptLanguage: "en-GB,fr;q=0.4" })).toBe("en");
  });

  it("ends on English", () => {
    expect(pickUiLocale({})).toBe("en");
    expect(pickUiLocale({ profileLocale: "ja", cookieLocale: "zz", acceptLanguage: "de, ja;q=0.8" })).toBe("en");
  });
});
