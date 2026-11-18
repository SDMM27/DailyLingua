export interface PushPayload {
  title: string;
  body: string;
  /** A path of this app, opened when the notification is tapped. */
  url: string;
}

/**
 * The notification described by the text of a push message, or null when it is not one of ours.
 * The address must be a path of this app (it is opened on a tap): anything else becomes the home page.
 */
export function parsePushPayload(text: string | undefined): PushPayload | null {
  if (!text) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const { title, body, url } = value as Record<string, unknown>;
  if (typeof title !== "string" || title.trim() === "") return null;
  return {
    title: title.slice(0, 120),
    body: typeof body === "string" ? body.slice(0, 300) : "",
    url: typeof url === "string" && /^\/(?![/\\])/.test(url) ? url : "/",
  };
}
