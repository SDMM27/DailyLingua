import { DataError, type DataErrorCode } from "@dailylingua/data";

/** Keys of the `errors` messages that a failed save can show. */
export type SaveErrorKey = "generic" | "unauthenticated" | "invalid" | "conflict" | "notFound";

const KEYS: Record<DataErrorCode, SaveErrorKey> = {
  unauthenticated: "unauthenticated",
  invalid: "invalid",
  conflict: "conflict",
  not_found: "notFound",
  unknown: "generic",
};

/** The message key for an error thrown by the data layer; anything else is generic. */
export function saveErrorKey(error: unknown): SaveErrorKey {
  return error instanceof DataError ? KEYS[error.code] : "generic";
}
