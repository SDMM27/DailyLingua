import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { createFailoverParseClient, shouldSwitchKey } from "./anthropic-client";

type FakeClient = { messages: { parse(params: unknown): Promise<unknown> } };

const headers = new Headers();
const authError = () => new Anthropic.AuthenticationError(401, { type: "error" }, "invalid x-api-key", headers);
const rateLimitError = () => new Anthropic.RateLimitError(429, { type: "error" }, "slow down", headers);
const creditError = () =>
  new Anthropic.BadRequestError(
    400,
    { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the API." } },
    "Your credit balance is too low to access the API.",
    headers,
  );
const serverError = () => new Anthropic.InternalServerError(500, { type: "error" }, "boom", headers);

/** Fake factory: one `parse` mock per key, each answering with its own outcome. */
function setup(outcomes: Record<string, () => unknown>) {
  const parses: Record<string, ReturnType<typeof vi.fn<(params: unknown) => Promise<unknown>>>> = {};
  const createClient = vi.fn((apiKey: string): FakeClient => {
    parses[apiKey] = vi.fn(async (params: unknown) => (void params, outcomes[apiKey]()));
    return { messages: { parse: parses[apiKey] } };
  });
  return { createClient, parses };
}

const fail = (error: Error) => () => {
  throw error;
};

describe("shouldSwitchKey", () => {
  it("switches on auth, permission, rate-limit and billing errors", () => {
    expect(shouldSwitchKey(authError())).toBe(true);
    expect(shouldSwitchKey(new Anthropic.PermissionDeniedError(403, { type: "error" }, "no", headers))).toBe(true);
    expect(shouldSwitchKey(rateLimitError())).toBe(true);
    expect(shouldSwitchKey(creditError())).toBe(true);
  });

  it("does not switch on other errors", () => {
    expect(shouldSwitchKey(new Anthropic.BadRequestError(400, { type: "error" }, "bad schema", headers))).toBe(false);
    expect(shouldSwitchKey(serverError())).toBe(false);
    expect(shouldSwitchKey(new Anthropic.APIConnectionTimeoutError())).toBe(false);
    expect(shouldSwitchKey(new Anthropic.APIConnectionError({ message: "down" }))).toBe(false);
    expect(shouldSwitchKey(new Error("x"))).toBe(false);
  });
});

describe("createFailoverParseClient", () => {
  const make = (apiKeys: string[], outcomes: Record<string, () => unknown>) => {
    const { createClient, parses } = setup(outcomes);
    const client = createFailoverParseClient<FakeClient>({ apiKeys, timeoutMs: 1000, createClient });
    return { client, createClient, parses };
  };

  it("uses the primary key and never creates the fallback client", async () => {
    const { client, createClient } = make(["a", "b"], { a: () => "ok-a", b: () => "ok-b" });
    await expect(client.messages.parse({})).resolves.toBe("ok-a");
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith("a");
  });

  it.each([
    ["401", authError],
    ["429", rateLimitError],
    ["400 credit balance", creditError],
  ])("falls over to the next key on %s, with the same params", async (_label, error) => {
    const { client, parses } = make(["a", "b"], { a: fail(error()), b: () => "ok-b" });
    const params = { model: "m" };
    await expect(client.messages.parse(params)).resolves.toBe("ok-b");
    expect(parses.b).toHaveBeenCalledWith(params);
  });

  it("stays on the fallback once the primary failed", async () => {
    const { client, parses } = make(["a", "b"], { a: fail(authError()), b: () => "ok-b" });
    await client.messages.parse({});
    await client.messages.parse({});
    expect(parses.a).toHaveBeenCalledTimes(1);
    expect(parses.b).toHaveBeenCalledTimes(2);
  });

  it("rethrows errors that another key would not fix", async () => {
    for (const error of [serverError(), new Anthropic.APIConnectionTimeoutError()]) {
      const { client, createClient } = make(["a", "b"], { a: fail(error), b: () => "ok-b" });
      await expect(client.messages.parse({})).rejects.toBe(error);
      expect(createClient).toHaveBeenCalledTimes(1);
    }
  });

  it("rethrows when there is no other key", async () => {
    const error = authError();
    const { client } = make(["a"], { a: fail(error) });
    await expect(client.messages.parse({})).rejects.toBe(error);
  });

  it("throws the last error when every key fails", async () => {
    const last = rateLimitError();
    const { client } = make(["a", "b"], { a: fail(authError()), b: fail(last) });
    await expect(client.messages.parse({})).rejects.toBe(last);
  });
});
