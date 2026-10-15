/**
 * A generator failed in a way the orchestrator can report and fall back from.
 *
 * `reason` is a short machine-readable slug ("refusal", "max_tokens", "invalid_output",
 * "api_error", "timeout", ...). Messages are stored in the database and logged: they must never
 * carry secrets, so API errors are reduced to a status and a type (never headers or raw errors).
 */
export class GenerationError extends Error {
  constructor(
    readonly reason: string,
    message?: string,
  ) {
    super(message ?? reason);
    this.name = "GenerationError";
  }
}
