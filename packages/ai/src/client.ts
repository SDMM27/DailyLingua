import Anthropic from "@anthropic-ai/sdk";
import type { AiClient } from "./call";

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

/**
 * An `AiClient` over the real SDK that falls over to the next API key when the current one is
 * refused (see `shouldSwitchKey`). The index of the last key that worked is kept for the lifetime of
 * the object, so an exhausted primary key costs one failing call, not one per request. The keys are
 * received (primary first): this package reads no environment variable. Never logs keys or raw errors.
 * The SDK's own retries are left to the caller (the gateway retries once itself).
 */
export function createAnthropicClient(options: {
  apiKeys: string[];
  /** Replaces the SDK client, for tests. */
  createClient?: (apiKey: string) => AiClient;
}): AiClient {
  const { apiKeys } = options;
  const createClient =
    options.createClient ?? ((apiKey: string): AiClient => new Anthropic({ apiKey, maxRetries: 0 }));
  const clients: (AiClient | undefined)[] = [];
  let current = 0;

  function clientAt(index: number): AiClient {
    return (clients[index] ??= createClient(apiKeys[index] as string));
  }

  return {
    messages: {
      async create(params, requestOptions) {
        // With no key at all, let the SDK raise its own "missing key" error.
        if (apiKeys.length === 0) return (clients[0] ??= createClient("")).messages.create(params, requestOptions);
        for (let index = current; ; index++) {
          try {
            const result = await clientAt(index).messages.create(params, requestOptions);
            current = index;
            return result;
          } catch (error) {
            if (index >= apiKeys.length - 1 || !shouldSwitchKey(error)) throw error;
          }
        }
      },
    },
  };
}
