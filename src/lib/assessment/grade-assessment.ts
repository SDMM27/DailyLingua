import {
  ASSESSMENT_GRADING_ATTEMPTS,
  decideComprehension,
  decideSpeaking,
  decideWriting,
  type AnswerVerdict,
} from "@/lib/domain/assessment";
import {
  assessmentAnswersSchema,
  type AssessmentAnswers,
  type AssessmentDossier,
  type AssessmentGradingResult,
  type AssessmentQuestion,
  type AssessmentResults,
  type AssessmentReview,
} from "@/lib/schemas/assessment";
import { GenerationError } from "@/lib/generation/errors";
import type { AssessmentGrader } from "@/lib/generation/assessment-grading";
import type { AssessmentGradingRequest } from "@/lib/generation/assessment-grading-prompt";
import { ASSESSMENT_DOSSIERS } from "./dossiers";
import { isDossierVisible, type AssessmentDraftPolicy } from "./policy";
import { SPEAKING_CLAIMS } from "./speaking-claims";
import type { AssessmentGradingStore } from "./supabase-store";

export type GradeAssessmentOutcome = AssessmentGradingResult | { status: "not-found" };

/** Comment of a question left blank in a test that was started: it counts as wrong, without the model. */
export const UNANSWERED_COMMENT = "Tu n’as pas répondu à cette question.";

const isAnswered = (value: string | undefined): value is string => value !== undefined && value.trim() !== "";

type Review = Pick<AssessmentReview, "questions" | "writing">;

/**
 * Results of a dossier from the grader's review (no review = nothing was sent to the model). A
 * test with no answer at all is not assessed; a blank answer in a test that was started is wrong.
 * The decision is made here, never by the model.
 */
function buildResults(
  dossier: AssessmentDossier,
  answers: AssessmentAnswers,
  listeningPlays: number,
  graded: Review | null,
): AssessmentResults {
  const questions: AssessmentReview["questions"] = {};

  function comprehension(list: AssessmentQuestion[], started: boolean) {
    if (!started) return null;
    const verdicts: AnswerVerdict[] = list.map((q) => {
      const given = graded?.questions[q.id];
      const entry = isAnswered(answers.questions[q.id]) && given ? given : { verdict: "wrong" as const, comment: UNANSWERED_COMMENT };
      questions[q.id] = entry;
      return entry.verdict;
    });
    return decideComprehension(dossier.level, verdicts);
  }

  const reading = comprehension(dossier.reading.questions, dossier.reading.questions.some((q) => isAnswered(answers.questions[q.id])));
  const listening = comprehension(
    dossier.listening.questions,
    listeningPlays > 0 || dossier.listening.questions.some((q) => isAnswered(answers.questions[q.id])),
  );

  const writingReview = isAnswered(answers.writing) ? (graded?.writing ?? null) : null;
  const writing = writingReview ? decideWriting(dossier.level, Object.values(writingReview.scores)) : null;

  const claimIds = new Set(SPEAKING_CLAIMS.map((c) => c.id));
  const claimed = Object.fromEntries(Object.entries(answers.speaking).filter(([id]) => claimIds.has(id)));
  const speaking = decideSpeaking(SPEAKING_CLAIMS, claimed);

  return {
    reading,
    listening,
    writing,
    speaking: speaking ? { ...speaking, declared: true } : null,
    review: { questions, writing: writingReview },
  };
}

/**
 * Grades an assessment of `userId`: the answers go to the model once, in one call, and the levels
 * come from `decide*` (never from the model). Never throws for a model failure: the outcome is
 * `unavailable` and the attempt counted. The dossier is checked before an attempt is claimed or a
 * model called, and the answers graded are the ones stored with the result.
 */
export async function gradeAssessment(
  input: { userId: string; assessmentId: string },
  deps: { store: AssessmentGradingStore; grader: AssessmentGrader; policy: AssessmentDraftPolicy; log?: (message: string) => void },
): Promise<GradeAssessmentOutcome> {
  const { userId, assessmentId } = input;
  const { store, grader, policy, log } = deps;

  const assessment = await store.loadForGrading(userId, assessmentId);
  if (!assessment) return { status: "not-found" };
  if (assessment.status === "graded" && assessment.results) return { status: "ready", results: assessment.results };

  const dossier = ASSESSMENT_DOSSIERS[assessment.language]?.find((d) => d.id === assessment.dossierId);
  if (!dossier || dossier.language !== assessment.language || !isDossierVisible(dossier, policy)) {
    return { status: "unavailable-dossier" };
  }

  const parsed = assessmentAnswersSchema.safeParse(assessment.answers);
  if (!parsed.success) return { status: "empty" };
  const answers = parsed.data;

  const toGrade = [...dossier.reading.questions, ...dossier.listening.questions].filter((q) =>
    isAnswered(answers.questions[q.id]),
  );
  const hasText = isAnswered(answers.writing);
  if (toGrade.length === 0 && !hasText) {
    // Nothing for the model: only the declared speaking level can be recorded.
    const results = buildResults(dossier, answers, assessment.listeningPlays, null);
    if (!results.speaking) return { status: "empty" };
    await store.completeGrading({
      assessmentId,
      userId,
      answers,
      results,
      productionLevel: null,
      model: null,
      promptVersion: null,
      usage: null,
    });
    return { status: "ready", results };
  }

  const attempts = await store.claimGrading(assessmentId, userId);
  if (attempts === null) return { status: "limit" };

  const request: AssessmentGradingRequest = {
    language: dossier.language,
    level: dossier.level,
    questions: toGrade.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      referenceAnswer: q.referenceAnswer,
      expectedPoints: q.expectedPoints,
      answer: answers.questions[q.id],
    })),
    writing: hasText ? { task: dossier.writing.prompt, text: answers.writing } : null,
  };
  let grade;
  try {
    grade = await grader.grade(request);
  } catch (error) {
    // Only the reason and our own message: never the raw error (see GenerationError), nor the answers.
    const reason = error instanceof GenerationError ? `${error.reason}: ${error.message}` : "unexpected error";
    log?.(`assessment grading unavailable (assessment ${assessmentId}): ${reason}`);
    return { status: "unavailable", attemptsLeft: Math.max(0, ASSESSMENT_GRADING_ATTEMPTS - attempts) };
  }

  const results = buildResults(dossier, answers, assessment.listeningPlays, grade.review);
  await store.completeGrading({
    assessmentId,
    userId,
    answers,
    results,
    productionLevel: results.writing?.level ?? null,
    model: grade.model,
    promptVersion: grade.promptVersion,
    usage: grade.usage,
  });
  return { status: "ready", results };
}
