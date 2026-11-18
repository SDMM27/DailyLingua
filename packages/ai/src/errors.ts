/** Stable, UI-safe error codes of the gateway: the interface maps them to messages. */
export const aiErrorCodes = ["budget_exhausted", "quota_exceeded", "invalid_output", "provider_error", "timeout"] as const;
export type AiErrorCode = (typeof aiErrorCodes)[number];

/**
 * Error of the gateway. `message` is the code itself on purpose: the raw message of the provider can
 * echo the prompt (and so a learner's text) and must never reach the interface or the logs. The
 * original error is kept in `cause`, for server-side debugging only.
 */
export class AiError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, options?: { cause?: unknown }) {
    super(code, options);
    this.name = "AiError";
    this.code = code;
  }
}
