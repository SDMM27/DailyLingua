import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import type { GenerationRequest, WireMission } from "@/lib/schemas/generation";
import { createClaudeGenerator, type ParseClient } from "./claude-generator";
import { DEFAULT_MISSION_MODEL } from "./config";
import { GenerationError } from "./errors";
import { PROMPT_VERSION, SYSTEM_PROMPT } from "./prompt";

const API_KEY = "sk-ant-secret-key-123";

const request: GenerationRequest = {
  date: "2026-10-13",
  sessions: [
    {
      language: "it",
      level: "B1",
      targetLevel: "B2",
      focus: "",
      purpose: "general",
      topics: ["société"],
      minutes: 20,
      productionMode: "writing",
      productionMinutes: 6,
      candidates: [
        {
          id: "c0",
          type: "article",
          title: "Il titolo unico",
          summary: "Un riassunto",
          sourceName: "Fonte",
          difficulty: "B1",
          durationMinutes: 5,
          categories: [],
          publishedAt: null,
        },
      ],
    },
  ],
};

const parsed: WireMission = {
  sessions: [
    {
      language: "it",
      candidateIndex: 0,
      questions: [],
      expressions: [],
      production: { prompt: "p", hints_fr: [] },
    },
  ],
};

type Response = Awaited<ReturnType<ParseClient["messages"]["parse"]>>;

function fakeClient(respond: () => Response | Promise<Response>) {
  const parse = vi.fn(async (params: Parameters<ParseClient["messages"]["parse"]>[0]) => (void params, respond()));
  return { client: { messages: { parse } } as ParseClient, parse };
}

const ok = (overrides: Partial<Response> = {}): Response => ({
  parsed_output: parsed,
  stop_reason: "end_turn",
  usage: { input_tokens: 1200, output_tokens: 800 },
  ...overrides,
});

async function failure(client: ParseClient): Promise<GenerationError> {
  try {
    await createClaudeGenerator({ client, apiKey: API_KEY }).generate(request);
  } catch (error) {
    expect(error).toBeInstanceOf(GenerationError);
    return error as GenerationError;
  }
  throw new Error("expected a failure");
}

describe("createClaudeGenerator", () => {
  it("sends the expected request", async () => {
    const { client, parse } = fakeClient(() => ok());
    await createClaudeGenerator({ client }).generate(request);
    const params = parse.mock.calls[0][0];
    expect(params.model).toBe(DEFAULT_MISSION_MODEL);
    expect(params.max_tokens).toBe(16000);
    expect(params.system).toBe(SYSTEM_PROMPT);
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0].role).toBe("user");
    expect(params.messages[0].content).toContain("Il titolo unico");
    expect(params.output_config.effort).toBe("medium");
    expect(params.output_config.format).toBeDefined();
    for (const forbidden of ["temperature", "top_p", "top_k", "thinking"]) {
      expect(params).not.toHaveProperty(forbidden);
    }
  });

  it("uses the configured model and maps the result", async () => {
    const { client, parse } = fakeClient(() => ok());
    const generator = createClaudeGenerator({ client, model: "claude-test-1" });
    const result = await generator.generate(request);
    expect(generator.name).toBe("claude");
    expect(parse.mock.calls[0][0].model).toBe("claude-test-1");
    expect(result).toEqual({
      source: "ai",
      model: "claude-test-1",
      promptVersion: PROMPT_VERSION,
      sessions: parsed.sessions,
      usage: { inputTokens: 1200, outputTokens: 800 },
    });
  });

  it("maps refusals, truncation and unparsable output", async () => {
    expect((await failure(fakeClient(() => ok({ stop_reason: "refusal" })).client)).reason).toBe("refusal");
    expect((await failure(fakeClient(() => ok({ stop_reason: "max_tokens" })).client)).reason).toBe("max_tokens");
    expect((await failure(fakeClient(() => ok({ parsed_output: null })).client)).reason).toBe("invalid_output");
  });

  it("maps SDK errors without leaking secrets", async () => {
    const headers = new Headers({ "x-api-key": API_KEY });
    const cases: [Error, string][] = [
      [new Anthropic.APIConnectionTimeoutError(), "timeout"],
      [new Anthropic.APIConnectionError({ message: `fail ${API_KEY}` }), "network"],
      [new Anthropic.RateLimitError(429, { type: "error" }, `slow down ${API_KEY}`, headers), "rate_limited"],
      [new Anthropic.AuthenticationError(401, { type: "error" }, `bad key ${API_KEY}`, headers), "auth"],
      [new Anthropic.InternalServerError(500, { type: "error" }, `boom ${API_KEY}`, headers), "api_error"],
      [new Error(`weird ${API_KEY}`), "api_error"],
    ];
    for (const [error, expected] of cases) {
      const caught = await failure(fakeClient(() => Promise.reject(error)).client);
      expect(caught.reason).toBe(expected);
      expect(caught.message).not.toContain(API_KEY);
      expect(JSON.stringify(caught)).not.toContain(API_KEY);
    }
    const server = await failure(
      fakeClient(() => Promise.reject(new Anthropic.InternalServerError(503, {}, "x", headers))).client,
    );
    expect(server.message).toContain("503");
  });
});
