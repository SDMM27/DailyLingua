import { describe, expect, it } from "vitest";
import {
  cleanUrl,
  decodeEntities,
  htmlToText,
  isAllowedHost,
  parseDurationMinutes,
  stripBoilerplate,
  truncate,
} from "./text";

describe("decodeEntities", () => {
  it("decodes named, decimal and hexadecimal entities", () => {
    expect(decodeEntities("&laquo;Il&nbsp;Post&raquo; &amp; co &#8217; &#x41C;")).toBe("«Il Post» & co ’ М");
  });

  it("keeps unknown entities and drops control or invalid code points", () => {
    expect(decodeEntities("&unknown; a&#0;b&#x110000;c")).toBe("&unknown; abc");
  });
});

describe("htmlToText", () => {
  it("removes inline tags without adding spaces before punctuation", () => {
    expect(htmlToText('native to <a href="/wiki/Aruba">Aruba</a>, <b>Bonaire</b>.')).toBe("native to Aruba, Bonaire.");
  });

  it("turns block tags into spaces and drops scripts, styles and figures", () => {
    expect(
      htmlToText("<p>One</p><p>Two</p><script>alert(1)</script><style>p{}</style><figure><img src=x>caption</figure>"),
    ).toBe("One Two");
  });

  it("removes markup that was escaped once more inside the feed", () => {
    expect(htmlToText("&lt;p&gt;Текст &lt;em&gt;статьи&lt;/em&gt;&lt;/p&gt;")).toBe("Текст статьи");
  });

  it("removes soft hyphens and collapses whitespace", () => {
    expect(htmlToText("Straßen­bahn \n\t Freiburg")).toBe("Straßenbahn Freiburg");
  });
});

describe("stripBoilerplate", () => {
  it("removes WordPress and 'read more' endings", () => {
    expect(stripBoilerplate("Le texte. The post Titre appeared first on Global Voices.")).toBe("Le texte.");
    expect(stripBoilerplate("Le texte […]")).toBe("Le texte");
    expect(stripBoilerplate("Текст статьи. Читать далее…")).toBe("Текст статьи.");
  });
});

describe("truncate", () => {
  it("leaves short text alone", () => {
    expect(truncate("Bonjour", 10)).toBe("Bonjour");
  });

  it("cuts at a word boundary and adds an ellipsis within the limit", () => {
    const result = truncate("Le ritorno dei treni notturni in Europa", 25);
    expect(result).toBe("Le ritorno dei treni…");
    expect(Array.from(result).length).toBeLessThanOrEqual(25);
  });

  it("cuts scripts without spaces at a character boundary", () => {
    expect(truncate("フランク王国は五世紀後半に建てられた王国", 8)).toBe("フランク王国は…");
  });

  it("never splits a surrogate pair", () => {
    expect(truncate("😀😀😀😀😀", 3)).toBe("😀😀…");
  });
});

describe("cleanUrl", () => {
  it("removes tracking parameters and the fragment, keeps the others", () => {
    expect(
      cleanUrl("https://arzamas.academy/courses/230?utm_campaign=rss&utm_source=rss_link&page=2#top")?.toString(),
    ).toBe("https://arzamas.academy/courses/230?page=2");
    expect(cleanUrl("https://learngerman.dw.com/de/a-1?maca=de-DKpodcast")?.toString()).toBe(
      "https://learngerman.dw.com/de/a-1",
    );
  });

  it("resolves relative links against the base", () => {
    expect(cleanUrl("/wiki/Userkare", "https://en.wikipedia.org/")?.toString()).toBe(
      "https://en.wikipedia.org/wiki/Userkare",
    );
  });

  it("rejects other schemes, credentials and garbage", () => {
    expect(cleanUrl("javascript:alert(1)")).toBeNull();
    expect(cleanUrl("ftp://example.com/file")).toBeNull();
    expect(cleanUrl("https://user:pass@example.com/")).toBeNull();
    expect(cleanUrl("not a url")).toBeNull();
  });
});

describe("isAllowedHost", () => {
  it("accepts the host and its subdomains only", () => {
    expect(isAllowedHost("www.bbc.com", ["bbc.com"])).toBe(true);
    expect(isAllowedHost("BBC.COM.", ["bbc.com"])).toBe(true);
    expect(isAllowedHost("evilbbc.com", ["bbc.com"])).toBe(false);
    expect(isAllowedHost("bbc.com.evil.example", ["bbc.com"])).toBe(false);
  });
});

describe("parseDurationMinutes", () => {
  it("reads seconds, MM:SS and HH:MM:SS, rounded up", () => {
    expect(parseDurationMinutes("125")).toBe(3);
    expect(parseDurationMinutes("07:30")).toBe(8);
    expect(parseDurationMinutes("1:02:03")).toBe(63);
  });

  it("returns null for missing, zero or unreadable values", () => {
    expect(parseDurationMinutes(undefined)).toBeNull();
    expect(parseDurationMinutes("0")).toBeNull();
    expect(parseDurationMinutes("about 5 min")).toBeNull();
  });
});
