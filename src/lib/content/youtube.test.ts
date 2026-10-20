import { describe, expect, it } from "vitest";
import { youtubeEmbedUrl, youtubeVideoId, youtubeWatchUrl } from "./youtube";

describe("youtubeVideoId", () => {
  it("reads the id of a watch link on the YouTube hosts", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=abcdEFGhi_1")).toBe("abcdEFGhi_1");
    expect(youtubeVideoId("https://youtube.com/watch?v=abcdEFGhi_1")).toBe("abcdEFGhi_1");
    expect(youtubeVideoId("https://m.youtube.com/watch?feature=share&v=abc-EFGhi_1")).toBe("abc-EFGhi_1");
  });

  it("refuses Shorts, channels, other paths and other hosts", () => {
    expect(youtubeVideoId("https://www.youtube.com/shorts/abcdEFGhi_1")).toBeNull();
    expect(youtubeVideoId("https://www.youtube.com/channel/UCbxb2fqe9oNgglAoYqsYOtQ")).toBeNull();
    expect(youtubeVideoId("https://www.youtube.com/embed/abcdEFGhi_1")).toBeNull();
    expect(youtubeVideoId("https://youtu.be/abcdEFGhi_1")).toBeNull();
    expect(youtubeVideoId("https://evil.example/watch?v=abcdEFGhi_1")).toBeNull();
    expect(youtubeVideoId("https://www.youtube.com.evil.example/watch?v=abcdEFGhi_1")).toBeNull();
  });

  it("refuses ids that are not 11 characters of [A-Za-z0-9_-]", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(youtubeVideoId("https://www.youtube.com/watch?v=abcdEFGhi_12")).toBeNull();
    expect(youtubeVideoId("https://www.youtube.com/watch?v=abcdEFGhi/1")).toBeNull();
    expect(youtubeVideoId("https://www.youtube.com/watch")).toBeNull();
  });

  it("refuses text that is not a web link", () => {
    expect(youtubeVideoId("not a url")).toBeNull();
    expect(youtubeVideoId("javascript:alert(1)")).toBeNull();
  });
});

describe("youtubeWatchUrl", () => {
  it("is the canonical link that youtubeVideoId reads back", () => {
    expect(youtubeVideoId(youtubeWatchUrl("abcdEFGhi_1"))).toBe("abcdEFGhi_1");
  });
});

describe("youtubeEmbedUrl", () => {
  it("uses the privacy-enhanced domain with subtitles in the studied language", () => {
    expect(youtubeEmbedUrl("abcdEFGhi_1", "de")).toBe(
      "https://www.youtube-nocookie.com/embed/abcdEFGhi_1?autoplay=1&playsinline=1&rel=0&hl=fr&cc_lang_pref=de&cc_load_policy=1",
    );
  });
});
