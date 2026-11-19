import type { BatchSender, DeliveryReport, PendingEvent } from "@dailylingua/core";
import { deliveryReportSchema } from "@dailylingua/schemas";
import { ACCOUNT_HEADER } from "./account";

export const EVENTS_ENDPOINT = "/api/events";

export interface HttpSenderOptions {
  endpoint?: string;
  userId?: string;
  /** Injected in tests. */
  fetch?: typeof fetch;
}

/**
 * The `BatchSender` of the app: POSTs the batch to `/api/events` with the session cookie. A 200 whose body is a valid
 * delivery report resolves with it (the refused events are listed in `rejected`). Failures that no retry can fix are
 * turned into refusals, so they never block the queue: a 413 splits the batch in two and sends each half (recursively;
 * the reports are merged), a 413 on a single event refuses it, and a 400 or 415 refuses every event of the batch (our
 * client never produces them; better dropped than stuck) - all as `invalid_payload`. Everything else is a passing
 * failure and rejects, so the queue keeps the events and tries again later: 401 (signed out), 403, 429 (rate limit),
 * 5xx, a network error, an answer that is not a delivery report.
 */
export function createHttpSender({ endpoint = EVENTS_ENDPOINT, userId, fetch: fetcher }: HttpSenderOptions = {}): BatchSender {
  const refuse = (batch: readonly PendingEvent[]): DeliveryReport => ({ rejected: batch.map((event) => ({ clientEventId: event.clientEventId, reason: "invalid_payload" })) });

  async function deliver(batch: readonly PendingEvent[]): Promise<DeliveryReport> {
    const send = fetcher ?? fetch;
    const response = await send(endpoint, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(userId ? { [ACCOUNT_HEADER]: userId } : {}) },
      body: JSON.stringify(batch),
    });
    if (response.status === 413) {
      if (batch.length <= 1) return refuse(batch);
      const middle = Math.ceil(batch.length / 2);
      const first = await deliver(batch.slice(0, middle));
      const second = await deliver(batch.slice(middle));
      return { rejected: [...first.rejected, ...second.rejected] };
    }
    if (response.status === 400 || response.status === 415) return refuse(batch);
    if (response.status !== 200) throw new Error(`The server answered ${response.status}`);
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("The server answer is not JSON");
    }
    const report = deliveryReportSchema.safeParse(body);
    if (!report.success) throw new Error("The server answer is not a delivery report");
    return report.data;
  }

  return (batch) => deliver(batch);
}
