import {
  AiError, ROLEPLAY_PROMPT_VERSION, ROLEPLAY_SYSTEM_PROMPT, buildRoleplayOpeningMessage, buildRoleplayReviewMessage, buildRoleplayTurnMessage,
  type AiGateway, type RoleplayPromptLine, type RoleplayPromptScenario,
} from "@dailylingua/ai";
import { getRoleplayScenario, offeredRoleplayScenarios } from "@dailylingua/content";
import { isTargetLanguage, languageDisplayName, learningDay } from "@dailylingua/core";
import { learnerTurnsOf, turnsLeftOf, type RoleplayLearner, type RoleplayRow, type RoleplayStore } from "@dailylingua/data";
import {
  MAX_ROLEPLAY_NOTE_CHARS, MAX_ROLEPLAY_REVIEW_ITEMS, ROLEPLAY_OBJECTIVES, languageCodeSchema, roleplayOpeningOutputSchema, roleplayReviewOutputSchema,
  roleplayTurnOutputSchema, type CefrLevel, type ObjectivesMet, type RoleplayGame, type RoleplayResponse, type RoleplayReview, type RoleplayReviewOutput,
  type RoleplayScenario, type RoleplayTurn, type RoleplayTurnRequest, type RoleplayStartRequest,
} from "@dailylingua/schemas";
import { writingLevels } from "@/lib/ingest/build-state";

/**
 * The role play on the server (`j5-pr3-jeu-de-role.md` §2 and §3). Every function takes the `userId` of the authenticated
 * session, never one from a request, and the store filters on it: a game of another account is `not_found`. The model
 * is reached only through the gateway, which counts the quotas and stops at the budget. Nothing of the learner's text
 * is put in an error or a log.
 */

export interface RoleplayDeps {
  store: Pick<RoleplayStore, "readLearner" | "readActive" | "read" | "listSince" | "readXp" | "create" | "saveTurns" | "finish" | "abandon">;
  getAi(): AiGateway | null;
  now(): Date;
}

interface Caller {
  userId: string;
  isGuest?: boolean;
}

/** Longest reply or translation kept from the model: a reply is two short sentences, this only bounds a runaway answer. */
const MAX_REPLY_CHARS = 600;

const normalize = (text: string) => text.normalize("NFC").replace(/\s+/gu, " ").trim();
const MS_PER_DAY = 86_400_000;

export function toGame(row: RoleplayRow): RoleplayGame {
  return {
    id: row.id,
    scenarioId: row.scenarioId,
    language: row.language,
    level: row.level,
    status: row.status,
    turns: row.turns,
    objectivesMet: row.objectivesMet,
    learnerTurns: learnerTurnsOf(row.turns),
    turnsLeft: turnsLeftOf(row),
    review: row.review,
    createdAt: row.createdAt,
    finishedAt: row.finishedAt,
  };
}

const lastReply = (row: RoleplayRow): { text: string; translation: string } | null => {
  const last = [...row.turns].reverse().find((turn) => turn.role === "ai");
  return last?.role === "ai" ? { text: last.text, translation: last.translation } : null;
};

const ready = (row: RoleplayRow): RoleplayResponse => ({ status: "ready", game: toGame(row), reply: lastReply(row) });

/** The writing level of the learner in `language`, as the XP rules read it (a scenario is chosen for it). */
function levelOf(language: string, learner: RoleplayLearner): CefrLevel {
  const estimates = learner.skillEstimates.map((estimate) => ({ language, skill: estimate.skill, levelValue: estimate.levelValue }));
  return writingLevels(estimates)[language] ?? "B1";
}

const describe = (code: string) => ({ code, name: languageDisplayName(code, code) });

/** The scenario as the model reads it: always in English, the one language the instructions are in. */
function promptScenario(scenario: RoleplayScenario): RoleplayPromptScenario {
  const [one, two, three] = scenario.objectives;
  return {
    situation: scenario.situation.en,
    characterRole: scenario.aiRole.en,
    learnerRole: scenario.learnerRole.en,
    objectives: [one.en, two.en, three.en],
  };
}

const linesOf = (turns: readonly RoleplayTurn[]): RoleplayPromptLine[] =>
  turns.map((turn) => ({ speaker: turn.role === "ai" ? "character" : "learner", text: turn.text }));

function promptBase(row: Pick<RoleplayRow, "language" | "level">, scenario: RoleplayScenario, learner: RoleplayLearner) {
  return { studiedLanguage: describe(row.language), firstLanguage: describe(learner.nativeLanguage), level: row.level, scenario: promptScenario(scenario) };
}

/** What the failure of a model call means for the learner: a refused quota or budget, or a failure. */
function refusal(error: unknown): RoleplayResponse {
  if (error instanceof AiError && error.code === "quota_exceeded") return { status: "limit", reason: "daily" };
  if (error instanceof AiError && error.code === "budget_exhausted") return { status: "limit", reason: "budget" };
  return { status: "failed" };
}

const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max) : text);

// ------------------------------------------------------------------------------------------------ state

/** What the interface needs to offer a game: the game in progress, today's game, and the scenarios to propose. */
export async function readRoleplayState({ userId, isGuest }: Caller, language: string, deps: RoleplayDeps): Promise<RoleplayResponse> {
  const now = deps.now();
  if (!isTargetLanguage(language)) return { status: "not_found" };
  const learner = await deps.store.readLearner(userId, language);
  if (!learner?.enrolled) return { status: "not_found" };
  const [active, recent] = await Promise.all([deps.store.readActive(userId, now), deps.store.listSince(userId, new Date(now.getTime() - 2 * MS_PER_DAY))]);
  const day = learningDay(now, learner.timeZone);
  const today = recent.find((game) => learningDay(new Date(game.createdAt), learner.timeZone) === day) ?? null;
  const latestFinished = recent
    .filter((game) => game.status === "finished" && game.finishedAt && learningDay(new Date(game.finishedAt), learner.timeZone) === day)
    .sort((a, b) => Date.parse(b.finishedAt!) - Date.parse(a.finishedAt!))[0] ?? null;
  const level = levelOf(language, learner);
  return {
    status: "state",
    active: active ? toGame(active) : null,
    today: today ? toGame(today) : null,
    latestFinished: latestFinished ? toGame(latestFinished) : null,
    xp: latestFinished ? await deps.store.readXp(userId, latestFinished.id) : 0,
    level,
    offered: offeredRoleplayScenarios(level, Math.floor(Date.parse(day) / MS_PER_DAY)).map((scenario) => scenario.id),
    canStart: !isGuest && !active && !today && deps.getAi() !== null,
  };
}

// ------------------------------------------------------------------------------------------------ start

/** Starts a game: the character opens the conversation. One game a day (the `roleplay` quota of the gateway). */
export async function startRoleplay({ userId, isGuest }: Caller, request: RoleplayStartRequest, deps: RoleplayDeps): Promise<RoleplayResponse> {
  const now = deps.now();
  const scenario = getRoleplayScenario(request.scenarioId);
  if (!scenario || !isTargetLanguage(request.language)) return { status: "invalid_scenario" };
  const learner = await deps.store.readLearner(userId, request.language);
  if (!learner?.enrolled) return { status: "invalid_scenario" };
  const level = levelOf(request.language, learner);
  const order = ["A1", "A2", "B1", "B2", "C1", "C2"];
  if (order.indexOf(level) < order.indexOf(scenario.minLevel) || order.indexOf(level) > order.indexOf(scenario.maxLevel)) return { status: "invalid_scenario" };

  const existing = await deps.store.readActive(userId, now);
  if (existing) return { status: "active_exists", game: toGame(existing) };
  const ai = isGuest ? null : deps.getAi();
  if (!ai) return { status: "disabled" };

  let opening;
  try {
    opening = await ai.call({
      purpose: "roleplay",
      promptVersion: ROLEPLAY_PROMPT_VERSION,
      system: ROLEPLAY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildRoleplayOpeningMessage(promptBase({ language: request.language, level }, scenario, learner)) }],
      schema: roleplayOpeningOutputSchema,
      learner: { id: userId, timeZone: learner.timeZone },
    });
  } catch (error) {
    return refusal(error);
  }
  const reply = clip(opening.output.reply.trim(), MAX_REPLY_CHARS);
  if (!reply) return { status: "failed" };
  const turn: RoleplayTurn = { role: "ai", text: reply, translation: clip(opening.output.replyTranslation.trim(), MAX_REPLY_CHARS), at: now.toISOString() };
  const created = await deps.store.create({ userId, language: request.language, scenarioId: scenario.id, level, turns: [turn] });
  if (created) return ready(created);
  // Another start won the race (one active game an account): hand the winner back.
  const winner = await deps.store.readActive(userId, now);
  return winner ? { status: "active_exists", game: toGame(winner) } : { status: "failed" };
}

// ------------------------------------------------------------------------------------------------ turn

/** One learner turn: the character answers, the objectives only ever go from missed to reached. */
export async function playRoleplayTurn({ userId, isGuest }: Caller, gameId: string, request: RoleplayTurnRequest, deps: RoleplayDeps): Promise<RoleplayResponse> {
  const now = deps.now();
  const game = await deps.store.read(userId, gameId, now);
  if (!game) return { status: "not_found" };
  if (game.status !== "active" || turnsLeftOf(game) === 0) return { status: "game_over", game: toGame(game) };
  const scenario = getRoleplayScenario(game.scenarioId);
  const learner = await deps.store.readLearner(userId, game.language);
  if (!scenario || !learner) return { status: "not_found" };
  const ai = isGuest ? null : deps.getAi();
  if (!ai) return { status: "disabled" };

  const text = request.text.trim();
  let result;
  try {
    result = await ai.call({
      purpose: "roleplay_turn",
      promptVersion: ROLEPLAY_PROMPT_VERSION,
      system: ROLEPLAY_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: buildRoleplayTurnMessage({
          ...promptBase(game, scenario, learner), objectivesMet: game.objectivesMet, conversation: linesOf(game.turns), learnerMessage: text,
        }),
      }],
      schema: roleplayTurnOutputSchema,
      learner: { id: userId, timeZone: learner.timeZone },
    });
  } catch (error) {
    return refusal(error);
  }
  const reply = clip(result.output.reply.trim(), MAX_REPLY_CHARS);
  if (!reply || result.output.objectivesMet.length !== ROLEPLAY_OBJECTIVES) return { status: "failed" };

  // An objective reached stays reached: the model can only add.
  const flags = result.output.objectivesMet;
  const objectivesMet = game.objectivesMet.map((met, index) => met || flags[index] === true) as ObjectivesMet;
  const turns: RoleplayTurn[] = [
    ...game.turns,
    { role: "learner", text, via: request.via, at: now.toISOString() },
    { role: "ai", text: reply, translation: clip(result.output.replyTranslation.trim(), MAX_REPLY_CHARS), at: now.toISOString() },
  ];
  const saved = await deps.store.saveTurns({ userId, id: game.id, previousTurns: game.turns, turns, objectivesMet });
  if (saved) return ready(saved);
  const current = await deps.store.read(userId, gameId, now);
  return current ? { status: "game_over", game: toGame(current) } : { status: "not_found" };
}

// ------------------------------------------------------------------------------------------------ finish

/**
 * The review of a game. The model's `original` passages are only kept when they really are in a learner turn; the rest
 * (paraphrases, no-op corrections, repeats) is dropped, as for the written correction.
 */
export function validateRoleplayReview(output: RoleplayReviewOutput, learnerTurns: readonly string[], previous: ObjectivesMet): { review: RoleplayReview; objectivesMet: ObjectivesMet } | null {
  if (output.objectives.length !== ROLEPLAY_OBJECTIVES) return null;
  const turns = learnerTurns.map(normalize);
  const inTurns = (passage: string) => passage.length > 0 && turns.some((turn) => turn.includes(passage));
  const note = (text: string) => clip(text.trim(), MAX_ROLEPLAY_NOTE_CHARS);
  const seen = new Set<string>();
  const fresh = (original: string) => {
    if (seen.has(original)) return false;
    seen.add(original);
    return true;
  };
  const errors = output.errors.flatMap(({ original, corrected, explanation }) => {
    const from = normalize(original);
    const to = normalize(corrected);
    if (!inTurns(from) || !to || to === from || to.length > 300 || !fresh(from)) return [];
    return [{ original: from, corrected: to, explanation: note(explanation) }];
  }).slice(0, MAX_ROLEPLAY_REVIEW_ITEMS);
  const betterPhrasings = output.betterPhrasings.flatMap(({ original, natural, explanation }) => {
    const from = normalize(original);
    const to = normalize(natural);
    if (!inTurns(from) || !to || to === from || to.length > 300 || !fresh(from)) return [];
    return [{ original: from, natural: to, explanation: note(explanation) }];
  }).slice(0, MAX_ROLEPLAY_REVIEW_ITEMS);
  const objectivesMet = previous.map((met, index) => met || output.objectives[index]?.met === true) as ObjectivesMet;
  const detected = languageCodeSchema.safeParse(output.detectedLanguage.trim().toLowerCase());
  const [one, two, three] = objectivesMet.map((met, index) => ({ met, comment: note(output.objectives[index]?.comment ?? "") }));
  return {
    objectivesMet,
    review: {
      objectives: [one!, two!, three!],
      errors,
      betterPhrasings,
      detectedLanguage: detected.success && detected.data !== "und" ? detected.data : null,
    },
  };
}

/** Ends the game: the review is made once, stored, and read back on a repeat. A game with no learner turn is abandoned. */
export async function finishRoleplay({ userId, isGuest }: Caller, gameId: string, deps: RoleplayDeps): Promise<RoleplayResponse> {
  const now = deps.now();
  const game = await deps.store.read(userId, gameId, now);
  if (!game) return { status: "not_found" };
  if (game.status === "finished") return ready(game);
  if (game.status === "abandoned") return { status: "game_over", game: toGame(game) };
  if (learnerTurnsOf(game.turns) === 0) {
    const current = await deps.store.abandon(userId, game.id, now, game.turns) ?? await deps.store.read(userId, game.id, now);
    return current ? { status: "game_over", game: toGame(current) } : { status: "not_found" };
  }
  const scenario = getRoleplayScenario(game.scenarioId);
  const learner = await deps.store.readLearner(userId, game.language);
  if (!scenario || !learner) return { status: "not_found" };
  const ai = isGuest ? null : deps.getAi();
  if (!ai) return { status: "disabled" };

  const learnerTurns = game.turns.flatMap((turn) => (turn.role === "learner" ? [turn.text] : []));
  let result;
  try {
    result = await ai.call({
      purpose: "roleplay_review",
      promptVersion: ROLEPLAY_PROMPT_VERSION,
      system: ROLEPLAY_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: buildRoleplayReviewMessage({ ...promptBase(game, scenario, learner), conversation: linesOf(game.turns), learnerTurns }),
      }],
      schema: roleplayReviewOutputSchema,
      learner: { id: userId, timeZone: learner.timeZone },
    });
  } catch (error) {
    return refusal(error);
  }
  const checked = validateRoleplayReview(result.output, learnerTurns, game.objectivesMet);
  if (!checked) return { status: "failed" };
  const finished = await deps.store.finish({
    userId, id: game.id, previousTurns: game.turns, review: checked.review, objectivesMet: checked.objectivesMet, now,
  });
  if (finished) return ready(finished);
  // A concurrent finish won: serve what it stored.
  const current = await deps.store.read(userId, gameId, now);
  if (!current) return { status: "not_found" };
  return current.status === "finished" ? ready(current) : { status: "game_over", game: toGame(current) };
}
