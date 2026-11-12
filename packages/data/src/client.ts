import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as AppDatabase } from "./database.app.types";

export type { AppDatabase };

/**
 * An already authenticated client. This package never creates one and never reads the
 * environment: the app (server or native) builds the client and passes it in.
 */
export type AppClient = SupabaseClient<AppDatabase, "app">;

/** Query builder scoped to the `app` schema. */
export function appSchema(client: AppClient) {
  return client.schema("app");
}
