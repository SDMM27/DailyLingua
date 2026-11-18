import type { BatchSender, DeliveryReport, PendingEvent } from "@dailylingua/core";
import { deliveryReportSchema } from "@dailylingua/schemas";

export const EVENTS_ENDPOINT = "/api/events";

export interface HttpSenderOptions {
  endpoint?: string;
  /** Injected in tests. */
  fetch?: typeof fetch;
}

/**
 * The `BatchSender` of the app: POSTs the batch to `/api/events` with the session cookie. A 200 whose body is a valid
 * delivery report resolves with it (the refused events are listed in `rejected`). Everything else is a passing failure
 * and rejects, so the queue keeps the events and tries again later: 401 (signed out), 403, 429 (rate limit), 5xx, a
 * network error, an answer that is not a delivery report. A batch that no answer ever accepts (413, 400) stays in the
 * queue too: the server only refuses events one by one.
 */
export function createHttpSender({ endpoint = EVENTS_ENDPOINT, fetch: fetcher }: HttpSenderOptions = {}): BatchSender {
  return async (batch: readonly PendingEvent[]): Promise<DeliveryReport> => {
    const send = fetcher ?? fetch;
    const response = await send(endpoint, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
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
  };
}
