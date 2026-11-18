/** Storage key shared with @sdmm/design's initTheme. */
export const THEME_STORAGE_KEY = "sd-theme";

/** Paper colour of each scheme, for the browser chrome (meta theme-color). */
export const THEME_COLORS = { light: "#f5f1e8", dark: "#0f0e0c" } as const;

export type ThemeName = keyof typeof THEME_COLORS;

/**
 * Inlined in <head> before paint: light is the default, the reader's saved choice wins. Also sets the
 * `.js` class that @sdmm/design's reveal utilities expect.
 */
export const themeBootScript = `(function(){var d=document.documentElement,t="light";try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")t="dark"}catch(e){}d.setAttribute("data-theme",t);d.classList.add("js");var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="dark"?"${THEME_COLORS.dark}":"${THEME_COLORS.light}")})();`;
