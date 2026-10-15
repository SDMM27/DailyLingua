import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { wireMissionSchema, type ExerciseGenerator, type WireMission } from "@/lib/schemas/generation";
import { DEFAULT_MISSION_MODEL } from "./config";
import { GenerationError } from "./errors";
import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserMessage } from "./prompt";

/** The part of the SDK client used here, so tests can inject a fake. */
export interface ParseClient {
  messages: {
    parse(params: {
      model: string;
      max_tokens: number;
      system: string;
      messages: { role: "user"; content: string }[];
      output_config: { format: ReturnType<typeof zodOutputFormat<typeof wireMissionSchema>>; effort: "medium" };
    }): Promise<{
      parsed_output: WireMission | null;
      stop_reason: string | null;
      usage: { input_tokens: number; output_tokens: number };
    }>;
  };
}

export interface ClaudeGeneratorOptions {
  apiKey?: string;
  model?: string;
  client?: ParseClient;
  /** Default 60 s. */
  timeoutMs?: number;
}

/**
 * Maps an SDK error to a GenerationError carrying only its status and type: the raw error holds
 * request headers (API key included) and must never reach logs or the database.
 */
export function toGenerationError(error: unknown): GenerationError {
  if (error instanceof GenerationError) return error;
  if (error instanceof Anthropic.APIConnectionTimeoutError) return new GenerationError("timeout", "Claude : délai dépassé");
  if (error instanceof Anthropic.APIConnectionError) return new GenerationError("network", "Claude : erreur réseau");
  if (error instanceof Anthropic.APIError) {
    const reason =
      error instanceof Anthropic.RateLimitError
        ? "rate_limited"
        : error instanceof Anthropic.AuthenticationError
          ? "auth"
          : "api_error";
    return new GenerationError(reason, `Claude : erreur API (statut ${error.status ?? "inconnu"}, ${error.name})`);
  }
  return new GenerationError("api_error", "Claude : erreur inattendue");
}

/** Writes the exercises with Claude, through structured outputs validated against the wire schema. */
export function createClaudeGenerator(options: ClaudeGeneratorOptions = {}): ExerciseGenerator {
  const model = options.model ?? DEFAULT_MISSION_MODEL;
  let client: ParseClient | undefined = options.client;

  function getClient(): ParseClient {
    client ??= new Anthropic({
      apiKey: options.apiKey,
      timeout: options.timeoutMs ?? 60_000,
      maxRetries: 1,
    }) as unknown as ParseClient;
    return client;
  }

  return {
    name: "claude",
    async generate(request) {
      let response;
      try {
        // No temperature/top_p/top_k/thinking/prefill: the model rejects them.
        response = await getClient().messages.parse({
          model,
          max_tokens: 16000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildUserMessage(request) }],
          output_config: { format: zodOutputFormat(wireMissionSchema), effort: "medium" },
        });
      } catch (error) {
        throw toGenerationError(error);
      }
      if (response.stop_reason === "refusal") throw new GenerationError("refusal", "Claude a refusé de répondre");
      if (response.stop_reason === "max_tokens") {
        throw new GenerationError("max_tokens", "Claude : réponse tronquée (max_tokens)");
      }
      if (!response.parsed_output) throw new GenerationError("invalid_output", "Claude : réponse illisible");
      return {
        source: "ai",
        model,
        promptVersion: PROMPT_VERSION,
        sessions: response.parsed_output.sessions,
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
      };
    },
  };
}
