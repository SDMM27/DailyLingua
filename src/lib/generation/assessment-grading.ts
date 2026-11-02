import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  assessmentReviewSchema,
  wireAssessmentGradingSchema,
  type AssessmentReview,
  type WireAssessmentGrading,
} from "@/lib/schemas/assessment";
import { toGenerationError } from "./claude-generator";
import { DEFAULT_MISSION_MODEL } from "./config";
import { createFailoverParseClient } from "./anthropic-client";
import { GenerationError } from "./errors";
import {
  ASSESSMENT_GRADING_PROMPT_VERSION,
  ASSESSMENT_GRADING_SYSTEM_PROMPT,
  buildAssessmentGradingMessage,
  type AssessmentGradingRequest,
} from "./assessment-grading-prompt";

/** The part of the SDK client used here, so tests can inject a fake. */
export interface AssessmentParseClient {
  messages: {
    parse(params: {
      model: string;
      max_tokens: number;
      system: string;
      messages: { role: "user"; content: string }[];
      output_config: { format: ReturnType<typeof zodOutputFormat<typeof wireAssessmentGradingSchema>>; effort: "low" | "medium" };
    }): Promise<{
      parsed_output: WireAssessmentGrading | null;
      stop_reason: string | null;
      usage: { input_tokens: number; output_tokens: number };
    }>;
  };
}

export interface AssessmentGrade {
  review: AssessmentReview;
  model: string;
  promptVersion: string;
  usage: { inputTokens: number; outputTokens: number };
}

/** Grades the answers of one assessment. Throws `GenerationError` on any failure (the caller reports it as unavailable). */
export interface AssessmentGrader {
  grade(request: AssessmentGradingRequest): Promise<AssessmentGrade>;
}

export interface ClaudeAssessmentGraderOptions {
  apiKeys?: string[];
  model?: string;
  client?: AssessmentParseClient;
  effort?: "low" | "medium";
  /** Per attempt; the SDK retries once. Default 60 s: one call grades the whole assessment. */
  timeoutMs?: number;
}

/**
 * Maps the model's answer to the stored shape and enforces the contract: the ids it returns must
 * be exactly the ids it was sent (no missing, extra or repeated question), and the text is graded
 * if and only if one was sent. Scores and lengths are checked by `assessmentReviewSchema`; any
 * violation rejects the whole answer.
 */
export function validateAssessmentGrading(wire: WireAssessmentGrading, request: AssessmentGradingRequest): AssessmentReview {
  const sent = request.questions.map((q) => q.id);
  const returned = wire.questions.map((q) => q.id);
  if (returned.length !== sent.length || new Set(returned).size !== returned.length || !sent.every((id) => returned.includes(id))) {
    throw new GenerationError("invalid_output", "retour invalide (questions : identifiants différents de ceux envoyés)");
  }
  if (request.writing && !wire.writing) {
    throw new GenerationError("invalid_output", "retour invalide (writing : texte envoyé mais non noté)");
  }

  const parsed = assessmentReviewSchema.safeParse({
    questions: Object.fromEntries(wire.questions.map((q) => [q.id, { verdict: q.verdict, comment: q.comment_fr }])),
    // A grade for a text that was not sent is dropped.
    writing:
      request.writing && wire.writing
        ? {
            scores: {
              grammar: wire.writing.grammar,
              vocabulary: wire.writing.vocabulary,
              syntax: wire.writing.syntax,
              adequacy: wire.writing.adequacy,
            },
            comment: wire.writing.comment_fr,
          }
        : null,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new GenerationError("invalid_output", `retour invalide (${issue?.path.join(".")}: ${issue?.message})`);
  }
  return parsed.data;
}

/** Grades an assessment with Claude, through structured outputs validated against the wire schema. */
export function createClaudeAssessmentGrader(options: ClaudeAssessmentGraderOptions = {}): AssessmentGrader {
  const model = options.model ?? DEFAULT_MISSION_MODEL;
  let client: AssessmentParseClient | undefined = options.client;

  function getClient(): AssessmentParseClient {
    client ??= createFailoverParseClient<AssessmentParseClient>({
      apiKeys: options.apiKeys ?? [],
      timeoutMs: options.timeoutMs ?? 60_000,
    });
    return client;
  }

  return {
    async grade(request) {
      let response;
      try {
        response = await getClient().messages.parse({
          model,
          max_tokens: 8000,
          system: ASSESSMENT_GRADING_SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildAssessmentGradingMessage(request) }],
          output_config: { format: zodOutputFormat(wireAssessmentGradingSchema), effort: options.effort ?? "medium" },
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
        review: validateAssessmentGrading(response.parsed_output, request),
        model,
        promptVersion: ASSESSMENT_GRADING_PROMPT_VERSION,
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
      };
    },
  };
}
