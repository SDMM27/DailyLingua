import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Error codes of the sign-in and sign-up forms. They are keys of the `errors` messages: the
 * actions never return text, the form translates the code in the visitor's language.
 */
export type AuthErrorCode =
  | "generic"
  | "invalidCredentials"
  | "emailRequired"
  | "emailInvalid"
  | "emailTaken"
  | "passwordTooShort"
  | "passwordWeak"
  | "tooManyRequests"
  | "botCheck";

const AUTH_ERROR_CODES: readonly AuthErrorCode[] = [
  "generic",
  "invalidCredentials",
  "emailRequired",
  "emailInvalid",
  "emailTaken",
  "passwordTooShort",
  "passwordWeak",
  "tooManyRequests",
  "botCheck",
];

/** The code carried by a failed validation (the message of each rule is its code). */
export function authErrorCode(message: string | undefined): AuthErrorCode {
  return AUTH_ERROR_CODES.find((code) => code === message) ?? "generic";
}

const emailSchema = z.string().trim().min(1, "emailRequired").pipe(z.email("emailInvalid"));

export const signInSchema = z.object({
  email: emailSchema,
  // No length rule here: an existing account is never refused for a short password, it just fails.
  password: z.string().min(1, "invalidCredentials"),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(PASSWORD_MIN_LENGTH, "passwordTooShort"),
});
