/** What Supabase Auth returns when a sign-in fails (subset of AuthError). */
export interface GuestSignInError {
  status?: number;
  code?: string;
}

/** French message shown when the anonymous sign-in of the trial fails. */
export function guestSignInErrorMessage(error: GuestSignInError): string {
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Trop d’essais depuis cette connexion, réessaie plus tard.";
  }
  if (error.code === "captcha_failed") {
    return "La vérification anti-robot a échoué. Réessaie.";
  }
  return "L’essai sans compte n’est pas disponible pour le moment.";
}
