import { describe, expect, it } from "vitest";
import { FeedParseError, parseFeed } from "./feed-parser";

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Медуза</title>
    <item>
      <title><![CDATA[Как города меняют язык]]></title>
      <link>https://meduza.io/feature/2026/10/13/kak</link>
      <guid isPermaLink="false">meduza-123</guid>
      <pubDate>Tue, 13 Oct 2026 08:00:00 +0300</pubDate>
      <description>&lt;p&gt;Лингвист &amp;laquo;объясняет&amp;raquo;&lt;/p&gt;</description>
      <dc:creator>Иван Иванов</dc:creator>
      <category>Наука</category>
      <category><![CDATA[Язык]]></category>
    </item>
    <item>
      <title>Only a permalink guid</title>
      <guid>https://meduza.io/news/2</guid>
      <content:encoded><![CDATA[<p>Full text of the article.</p>]]></content:encoded>
      <itunes:duration>12:30</itunes:duration>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>The Conversation</title>
  <entry>
    <id>tag:theconversation.com,2011:article/1</id>
    <title type="html">Why &lt;em&gt;cities&lt;/em&gt; sound different</title>
    <link rel="alternate" type="text/html" href="https://theconversation.com/why-1"/>
    <link rel="enclosure" href="https://images.example/1.jpg"/>
    <published>2026-10-12T10:00:00Z</published>
    <updated>2026-10-12T11:00:00Z</updated>
    <summary>Birds adapt.</summary>
    <author><name>Jane Doe</name></author>
    <category term="Science" />
  </entry>
</feed>`;

const RDF = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/"
         xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel rdf:about="https://www.tagesschau.de/"><title>tagesschau</title></channel>
  <item rdf:about="https://www.tagesschau.de/a-1">
    <title>Nachricht</title>
    <link>https://www.tagesschau.de/a-1</link>
    <description>Kurz.</description>
    <dc:date>2026-10-13T09:00:00+02:00</dc:date>
  </item>
</rdf:RDF>`;

/** Trimmed YouTube channel feed: a regular video and a Short (same entry shape, `/shorts/` link). */
const YOUTUBE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <link rel="self" href="http://www.youtube.com/feeds/videos.xml?channel_id=UCbxb2fqe9oNgglAoYqsYOtQ"/>
 <id>yt:channel:bxb2fqe9oNgglAoYqsYOtQ</id>
 <yt:channelId>bxb2fqe9oNgglAoYqsYOtQ</yt:channelId>
 <title>Easy German</title>
 <link rel="alternate" href="https://www.youtube.com/channel/UCbxb2fqe9oNgglAoYqsYOtQ"/>
 <author>
  <name>Easy German</name>
  <uri>https://www.youtube.com/channel/UCbxb2fqe9oNgglAoYqsYOtQ</uri>
 </author>
 <published>2011-01-12T14:11:21+00:00</published>
 <entry>
  <id>yt:video:abcdEFGhi_1</id>
  <yt:videoId>abcdEFGhi_1</yt:videoId>
  <yt:channelId>bxb2fqe9oNgglAoYqsYOtQ</yt:channelId>
  <title>Was machst du am Wochenende? | Easy German 500</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=abcdEFGhi_1"/>
  <author>
   <name>Easy German</name>
   <uri>https://www.youtube.com/channel/UCbxb2fqe9oNgglAoYqsYOtQ</uri>
  </author>
  <published>2026-10-10T11:00:03+00:00</published>
  <updated>2026-10-12T08:12:44+00:00</updated>
  <media:group>
   <media:title>Was machst du am Wochenende? | Easy German 500</media:title>
   <media:content url="https://www.youtube.com/v/abcdEFGhi_1?version=3" type="application/x-shockwave-flash" width="640" height="390"/>
   <media:thumbnail url="https://i2.ytimg.com/vi/abcdEFGhi_1/hqdefault.jpg" width="480" height="360"/>
   <media:description>Wir fragen Leute auf der Straße nach ihren Plänen.

Support us: https://www.patreon.com/easygerman</media:description>
   <media:community>
    <media:starRating count="1200" average="5.00" min="1" max="5"/>
    <media:statistics views="45000"/>
   </media:community>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:zyxWVUtsr-2</id>
  <yt:videoId>zyxWVUtsr-2</yt:videoId>
  <yt:channelId>bxb2fqe9oNgglAoYqsYOtQ</yt:channelId>
  <title>Kurz erklärt #shorts</title>
  <link rel="alternate" href="https://www.youtube.com/shorts/zyxWVUtsr-2"/>
  <author>
   <name>Easy German</name>
   <uri>https://www.youtube.com/channel/UCbxb2fqe9oNgglAoYqsYOtQ</uri>
  </author>
  <published>2026-10-11T09:00:00+00:00</published>
  <updated>2026-10-11T09:30:00+00:00</updated>
  <media:group>
   <media:title>Kurz erklärt #shorts</media:title>
   <media:content url="https://www.youtube.com/v/zyxWVUtsr-2?version=3" type="application/x-shockwave-flash" width="640" height="390"/>
   <media:thumbnail url="https://i4.ytimg.com/vi/zyxWVUtsr-2/hqdefault.jpg" width="480" height="360"/>
   <media:description/>
  </media:group>
 </entry>
</feed>`;

describe("parseFeed", () => {
  it("reads RSS 2.0 items, CDATA, entities, author and categories", () => {
    const feed = parseFeed(RSS);
    expect(feed.format).toBe("rss");
    expect(feed.title).toBe("Медуза");
    expect(feed.items).toHaveLength(2);
    expect(feed.items[0]).toMatchObject({
      title: "Как города меняют язык",
      link: "https://meduza.io/feature/2026/10/13/kak",
      guid: "meduza-123",
      description: "<p>Лингвист &laquo;объясняет&raquo;</p>",
      descriptionIsFullText: false,
      author: "Иван Иванов",
      categories: ["Наука", "Язык"],
    });
    expect(feed.items[0].publishedAt?.toISOString()).toBe("2026-10-13T05:00:00.000Z");
  });

  it("falls back to a permalink guid and to the full text, flagged as such", () => {
    const item = parseFeed(RSS).items[1];
    expect(item.link).toBe("https://meduza.io/news/2");
    expect(item.description).toBe("<p>Full text of the article.</p>");
    expect(item.descriptionIsFullText).toBe(true);
    expect(item.duration).toBe("12:30");
    expect(item.publishedAt).toBeNull();
  });

  it("reads Atom entries with their alternate link", () => {
    const feed = parseFeed(ATOM);
    expect(feed.format).toBe("atom");
    expect(feed.items[0]).toMatchObject({
      title: "Why <em>cities</em> sound different",
      link: "https://theconversation.com/why-1",
      description: "Birds adapt.",
      author: "Jane Doe",
      categories: ["Science"],
    });
    expect(feed.items[0].publishedAt?.toISOString()).toBe("2026-10-12T10:00:00.000Z");
  });

  it("reads RSS 1.0 (RDF) items", () => {
    const feed = parseFeed(RDF);
    expect(feed.format).toBe("rdf");
    expect(feed.items[0]).toMatchObject({ title: "Nachricht", link: "https://www.tagesschau.de/a-1" });
  });

  it("reads a YouTube feed: watch and Shorts links, description from media:group", () => {
    const feed = parseFeed(YOUTUBE);
    expect(feed.format).toBe("atom");
    expect(feed.items).toHaveLength(2);
    expect(feed.items[0]).toMatchObject({
      title: "Was machst du am Wochenende? | Easy German 500",
      link: "https://www.youtube.com/watch?v=abcdEFGhi_1",
      author: "Easy German",
      descriptionIsFullText: false,
    });
    expect(feed.items[0].description).toContain("Wir fragen Leute auf der Straße");
    expect(feed.items[0].publishedAt?.toISOString()).toBe("2026-10-10T11:00:03.000Z");
    expect(feed.items[1].link).toBe("https://www.youtube.com/shorts/zyxWVUtsr-2");
    expect(feed.items[1].description).toBeNull();
  });

  it("reads the first enclosure of an RSS item, with its type", () => {
    const feed = parseFeed(`<rss version="2.0"><channel><title>Pod</title>
      <item><title>One</title><enclosure url="https://cdn.example/1.mp3" length="123" type="audio/mpeg"/>
        <enclosure url="https://cdn.example/1.m4a" type="audio/mp4"/></item>
      <item><title>Two</title><enclosure url="https://cdn.example/2.mp3"/></item>
      <item><title>Three</title></item>
    </channel></rss>`);
    expect(feed.items.map((i) => i.enclosure)).toEqual([
      { url: "https://cdn.example/1.mp3", type: "audio/mpeg" },
      { url: "https://cdn.example/2.mp3", type: null },
      null,
    ]);
  });

  it("reads an Atom enclosure link, and no enclosure from RDF", () => {
    expect(parseFeed(ATOM).items[0].enclosure).toEqual({ url: "https://images.example/1.jpg", type: null });
    const rdf = parseFeed(`<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/">
      <item rdf:about="https://x.example/1"><title>A</title><link>https://x.example/1</link></item></rdf:RDF>`);
    expect(rdf.items[0].enclosure).toBeNull();
  });

  it("accepts an empty channel", () => {
    expect(parseFeed('<rss version="2.0"><channel><title>Vide</title></channel></rss>').items).toEqual([]);
  });

  it("refuses document type declarations (entity expansion attacks)", () => {
    const bomb = `<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;">]>
      <rss><channel><item><title>&lol2;</title></item></channel></rss>`;
    expect(() => parseFeed(bomb)).toThrow(FeedParseError);
  });

  it("refuses documents that are not feeds", () => {
    expect(() => parseFeed("<html><body>Not a feed</body></html>")).toThrow(FeedParseError);
    expect(() => parseFeed("")).toThrow(FeedParseError);
  });
});
