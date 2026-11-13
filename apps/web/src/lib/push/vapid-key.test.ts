import { describe, expect, it } from "vitest";
import { urlBase64ToBytes } from "./vapid-key";

describe("urlBase64ToBytes", () => {
  it("decodes the URL-safe alphabet, with or without padding", () => {
    // 0xfb 0xff 0xbf is "-_-_" in URL-safe base64 and "+/+/" in the standard alphabet.
    expect([...urlBase64ToBytes("-_-_")]).toEqual([0xfb, 0xff, 0xbf]);
    expect([...urlBase64ToBytes("AQID")]).toEqual([1, 2, 3]);
    expect([...urlBase64ToBytes("AQI")]).toEqual([1, 2]);
    expect([...urlBase64ToBytes("AQ")]).toEqual([1]);
  });

  it("gives the 65 bytes of an uncompressed P-256 point for a VAPID public key", () => {
    const key = "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM";
    const bytes = urlBase64ToBytes(key);
    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(0x04);
  });
});
