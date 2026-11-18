const BASE = "http://internal.invalid";

/**
 * Validates a post-login destination received in a URL (`?next=`): only an internal path is
 * accepted, anything else (absolute URL, protocol-relative `//host`, backslash tricks, control
 * characters that URL parsers silently drop) gives `fallback`. Prevents open redirects.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  // Backslashes are read as slashes by browsers; control characters are stripped by URL parsers.
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    if (new URL(raw, BASE).origin !== BASE) return fallback;
  } catch {
    return fallback;
  }
  return raw;
}
