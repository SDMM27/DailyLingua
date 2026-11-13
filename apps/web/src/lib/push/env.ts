export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  /** `mailto:` or `https:` address of whoever runs the server, sent to the push services. */
  subject: string;
}

/**
 * Read by name at request time (never inlined at build time, so a key added to the host's
 * environment is seen without a rebuild). The public key is not secret; the private key must never
 * be committed, logged or sent to the browser.
 */
export function vapidPublicKey(): string | null {
  return process.env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"]?.trim() || null;
}

/** The server's VAPID keys, or null when sending is off (no private key, or no public key). */
export function vapidConfig(requestOrigin: string): VapidConfig | null {
  const privateKey = process.env["VAPID_PRIVATE_KEY"]?.trim();
  const publicKey = vapidPublicKey();
  if (!privateKey || !publicKey) return null;
  return { publicKey, privateKey, subject: process.env["VAPID_SUBJECT"]?.trim() || requestOrigin };
}
