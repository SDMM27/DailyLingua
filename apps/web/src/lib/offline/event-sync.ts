import {
  DEFAULT_FLUSH_OPTIONS,
  INITIAL_FLUSH_STATE,
  flushQueue,
  type BatchSender,
  type EventQueue,
  type FlushOptions,
  type FlushResult,
  type FlushState,
} from "@dailylingua/core";

export interface EventSync {
  /** Delivers now, ignoring any waiting delay (a manual retry). */
  flushNow(): Promise<FlushResult>;
  stop(): void;
}

export interface EventSyncOptions {
  queue: EventQueue;
  send: BatchSender;
  /** Called after every attempt, for the screen. */
  onResult?: (result: FlushResult) => void;
  flush?: FlushOptions;
}

/**
 * Delivers the queue when it is started, when the network returns (`online`), after the growing delay
 * of a failure, and on demand. One flush at a time. The clock is read here, never in `@dailylingua/core`.
 */
export function startEventSync({ queue, send, onResult, flush = DEFAULT_FLUSH_OPTIONS }: EventSyncOptions): EventSync {
  let state: FlushState = INITIAL_FLUSH_STATE;
  let running: Promise<FlushResult> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const schedule = (result: FlushResult) => {
    clearTimeout(timer);
    if (stopped) return;
    if (result.outcome === "more") timer = setTimeout(() => void run(), 0);
    else if (result.outcome === "failed") timer = setTimeout(() => void run(), Math.max(0, state.retry.nextAttemptAt - Date.now()));
  };

  const run = (): Promise<FlushResult> => {
    running ??= flushQueue(queue, send, state, Date.now(), flush)
      .then((result) => {
        state = result.state;
        if (!stopped) onResult?.(result);
        schedule(result);
        return result;
      })
      .finally(() => {
        running = null;
      });
    return running;
  };

  const retryNow = () => {
    // The network is back: whatever the delay said, try again.
    state = { ...state, retry: INITIAL_FLUSH_STATE.retry };
    return run();
  };

  const onOnline = () => void retryNow();
  window.addEventListener("online", onOnline);
  void run();

  return {
    flushNow: retryNow,
    stop() {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
    },
  };
}
