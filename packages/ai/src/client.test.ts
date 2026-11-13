import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import type { AiClient, AiRequest, AiResponse } from "./call";
import { createAnthropicClient, shouldSwitchKey } from "./client";

const REQUEST: AiRequest = {
  model: "claude-haiku-5-5",
  max_tokens: 10,
  system: "s",
  messages: [{ role: "user", content: "u" }],
  output_config: { format: { type: "json_schema", schema: { type: "object" } }, effort: "medium" },
};
const RESPONSE: AiResponse = { content: [], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };

const apiError = (status: number, message = "x") => Anthropic.APIError.generate(status, { error: { message } }, message, new Headers());

/** One fake client per key: the key's behaviour is a response or an error. */
function fakes(behaviours: Record<string, AiResponse | Error>) {
  const used: string[] = [];
  const createClient = (apiKey: string): AiClient => ({
    messages: {
      async create() {
        used.push(apiKey);
        const behaviour = behaviours[apiKey];
        if (!behaviour) throw new Error(`unexpected key ${apiKey}`);
        if (behaviour instanceof Error) throw behaviour;
        return behaviour;
      },
    },
  });
  return { createClient, used };
}

describe("shouldSwitchKey", () => {
  it("switches on a refused key, a rate limit and a billing 400, not on anything a second key would share", () => {
    expect(shouldSwitchKey(apiError(401))).toBe(true);
    expect(shouldSwitchKey(apiError(403))).toBe(true);
    expect(shouldSwitchKey(apiError(429))).toBe(true);
    expect(shouldSwitchKey(apiError(400, "Your credit balance is too low"))).toBe(true);
    expect(shouldSwitchKey(apiError(400, "max_tokens too large"))).toBe(false);
    expect(shouldSwitchKey(apiError(500))).toBe(false);
    expect(shouldSwitchKey(new Anthropic.APIConnectionTimeoutError())).toBe(false);
    expect(shouldSwitchKey(new Error("boom"))).toBe(false);
  });
});

describe("createAnthropicClient", () => {
  it("uses the first key while it works", async () => {
    const { createClient, used } = fakes({ primary: RESPONSE, backup: RESPONSE });
    const client = createAnthropicClient({ apiKeys: ["primary", "backup"], createClient });
    await client.messages.create(REQUEST);
    expect(used).toEqual(["primary"]);
  });

  it("falls over to the next key when the first is refused, and stays on it", async () => {
    const { createClient, used } = fakes({ primary: apiError(401), backup: RESPONSE });
    const client = createAnthropicClient({ apiKeys: ["primary", "backup"], createClient });
    await client.messages.create(REQUEST);
    await client.messages.create(REQUEST);
    expect(used).toEqual(["primary", "backup", "backup"]);
  });

  it("does not switch on an error the other key would share", async () => {
    const { createClient, used } = fakes({ primary: apiError(500), backup: RESPONSE });
    const client = createAnthropicClient({ apiKeys: ["primary", "backup"], createClient });
    await expect(client.messages.create(REQUEST)).rejects.toMatchObject({ status: 500 });
    expect(used).toEqual(["primary"]);
  });

  it("throws the last error when every key is refused", async () => {
    const { createClient, used } = fakes({ primary: apiError(401), backup: apiError(429) });
    const client = createAnthropicClient({ apiKeys: ["primary", "backup"], createClient });
    await expect(client.messages.create(REQUEST)).rejects.toMatchObject({ status: 429 });
    expect(used).toEqual(["primary", "backup"]);
  });

  it("passes the request options through", async () => {
    const seen: unknown[] = [];
    const client = createAnthropicClient({
      apiKeys: ["k"],
      createClient: () => ({
        messages: {
          async create(_params, options) {
            seen.push(options);
            return RESPONSE;
          },
        },
      }),
    });
    await client.messages.create(REQUEST, { timeout: 1234, maxRetries: 0 });
    expect(seen).toEqual([{ timeout: 1234, maxRetries: 0 }]);
  });

  it("is a drop-in for the real SDK client (type-level: an Anthropic instance is an AiClient)", () => {
    const real: AiClient = new Anthropic({ apiKey: "not-a-real-key-and-never-used" });
    expect(typeof real.messages.create).toBe("function");
  });
});
