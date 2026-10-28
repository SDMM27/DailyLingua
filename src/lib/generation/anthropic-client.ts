import Anthropic from "@anthropic-ai/sdk";

/** Billing-related 400s: the key is valid but cannot spend, so another key may still work. */
const BILLING_MESSAGE = /credit balance|billing|spend limit|usage limit/i;

/**
 * Whether an error means "this key is unusable right now" (refused, revoked, out of credit, rate
 * limited) rather than a problem another key would share (timeout, network, 5xx, a bad request).
 */
export function shouldSwitchKey(error: unknown): boolean {
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError ||
    error instanceof Anthropic.RateLimitError
  ) {
    return true;
  }
  return error instanceof Anthropic.BadRequestError && BILLING_MESSAGE.test(error.message);
}

interface ParseCapableClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: { parse(params: any): Promise<any> };
}

/**
 * A client whose `messages.parse` falls over to the next API key when the current one is refused
 * (see `shouldSwitchKey`). The index of the last key that worked is kept for the lifetime of the
 * object, so an exhausted primary key costs one failing call, not one per request. Never logs keys
 * or raw errors.
 */
export function createFailoverParseClient<C extends ParseCapableClient>(options: {
  apiKeys: string[];
  timeoutMs: number;
  createClient?: (apiKey: string) => C;
}): C {
  const { apiKeys, timeoutMs } = options;
  const createClient =
    options.createClient ??
    ((apiKey: string) => new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 1 }) as unknown as C);
  const clients: (C | undefined)[] = [];
  let current = 0;

  function clientAt(index: number): C {
    return (clients[index] ??= createClient(apiKeys[index]));
  }

  return {
    messages: {
      async parse(params: unknown) {
        // With no key at all, let the SDK raise its own "missing key" error.
        if (apiKeys.length === 0) return clientAt(0).messages.parse(params);
        for (let index = current; ; index++) {
          try {
            const result = await clientAt(index).messages.parse(params);
            current = index;
            return result;
          } catch (error) {
            if (index >= apiKeys.length - 1 || !shouldSwitchKey(error)) throw error;
          }
        }
      },
    },
  } as C;
}
