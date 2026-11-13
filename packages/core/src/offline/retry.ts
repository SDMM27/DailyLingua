export interface RetryPolicy {
  /** Wait after the first failure. */
  baseDelayMs: number;
  /** The wait never grows beyond this. */
  maxDelayMs: number;
  /** Growth factor per consecutive failure. */
  factor: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = { baseDelayMs: 2_000, maxDelayMs: 5 * 60_000, factor: 2 };

/** Where the retry stands: consecutive failures, and the earliest instant of the next attempt. */
export interface RetryState {
  failures: number;
  /** Epoch milliseconds; 0 when nothing is waiting. */
  nextAttemptAt: number;
}

export const INITIAL_RETRY_STATE: RetryState = { failures: 0, nextAttemptAt: 0 };

/** Wait after `failures` consecutive failures (1 gives the base delay), growing and capped. */
export function backoffDelayMs(failures: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number {
  if (failures <= 0) return 0;
  return Math.min(policy.maxDelayMs, policy.baseDelayMs * policy.factor ** (failures - 1));
}

/** The state after one more failure at `now` (epoch milliseconds). */
export function recordFailure(state: RetryState, now: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): RetryState {
  const failures = state.failures + 1;
  return { failures, nextAttemptAt: now + backoffDelayMs(failures, policy) };
}

/** True when an attempt may start at `now`. */
export function isDue(state: RetryState, now: number): boolean {
  return now >= state.nextAttemptAt;
}
