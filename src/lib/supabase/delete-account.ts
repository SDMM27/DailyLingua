import "server-only";
import { createSupabaseAdminClient } from "./admin";

/**
 * Permanently deletes an account and everything it owns. Deleting the auth user cascades to the
 * profile and from there to languages, vocabulary, review journal, missions, progress and quiz
 * answers (all foreign keys are `on delete cascade`). Shared content is not personal and stays.
 * Needs the service role key: only a trusted server action may call it, with the id of the
 * session's own user.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(userId);
  if (error) throw new Error(`Suppression du compte : ${error.message}`);
}
