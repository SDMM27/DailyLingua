import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client, used only for the guest trial (`signInAnonymously`), so that the per-IP limit of
 * Supabase sees the visitor's address. The URL and the anon key come from the server as props.
 */
export function createSupabaseBrowserClient(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey);
}
