import { z } from "zod";

/**
 * Version of the XP scale written in `xp_ledger.rule_version` (`j2-jeu-xp-serie.md` §1). `j4.1` adds
 * `unit.complete` and the XP of unit items (`j4-pr1-architecture.md` §4); the other rules are those of `j2.1`.
 */
export const RULE_VERSION = "j4.1";

/** Stable XP rule identifiers (`xp_ledger.reason`), exactly those of `j2-jeu-xp-serie.md` §1. */
export const xpRuleIds = [
  "review.recognition",
  "review.production",
  "review.listening",
  "review.bonus.difficulty",
  "review.bonus.reconquest",
  "reading.understood",
  "reading.understood_well",
  "focus.first_try",
  "focus.second_try",
  "production.corrected",
  "rewrite.sentence",
  "rewrite.sentence_native",
  "error_of_day.reworked",
  "fluency.pass",
  "session.complete",
  /** A unit test passed for the first time (`j4-pr1-architecture.md` §4). */
  "unit.complete",
] as const;
export const xpRuleIdSchema = z.enum(xpRuleIds);
export type XpRuleId = z.infer<typeof xpRuleIdSchema>;

/** The four strands of an XP line (`meta.volet`); `session.complete` belongs to none. */
export const xpVolets = ["study", "input", "output", "fluency"] as const;
export const xpVoletSchema = z.enum(xpVolets);
export type XpVolet = z.infer<typeof xpVoletSchema>;

/** Why a correct attempt earned nothing (`attempt.result.xpReason`, `j2-jeu-xp-serie.md` §1). */
export const xpZeroReasons = [
  "not_due",
  "already_counted_today",
  "too_fast",
  "cap_reached",
  "diminishing",
  "too_similar",
  "too_short",
  "wrong_language",
  "reread",
  "late",
  /** A `listening` review in which the audio was never played (`audioPlays` is 0): added to the closed list of the spec. */
  "no_audio",
  /** A unit item already answered right before, or a unit already passed: its XP is earned once per account. */
  "already_earned",
] as const;
export const xpZeroReasonSchema = z.enum(xpZeroReasons);
export type XpZeroReason = z.infer<typeof xpZeroReasonSchema>;

/**
 * Permanent refusals of an event (`RejectedDelivery.reason`). The first seven are those of
 * `j2-architecture.md` §2, `before_served` is from `j2-jeu-xp-serie.md` §2.3; `unknown_item` and
 * `unknown_correction` are added for items, texts and corrections the server does not know. `server_refused` is
 * the server's own: the batch the event was in was refused by SQL for good and the event still failed when
 * replayed alone (`j2-pr1-lot-w.md`, D9). `too_many` is the server's cap on `production_submitted`: at most 10 are
 * accepted per rolling 24 hours of reception, the next ones are refused for good (`j2-pr1-lot-w.md` section 11, W-I1).
 * The last four are those of the units (`j4-pr1-architecture.md` §4): a unit absent or not published, an event on
 * another version of the unit (no grading on an old version), a test attempt id already used, a step whose
 * validation the server cannot prove from the attempts it knows.
 */
export const rejectionReasons = [
  "invalid_payload",
  "unknown_session",
  "foreign_session",
  "unknown_card",
  "unknown_item",
  "unknown_correction",
  "too_old",
  "in_future",
  "before_served",
  "duplicate_conflict",
  "server_refused",
  "too_many",
  "unknown_unit",
  "unit_version_mismatch",
  "duplicate_test_attempt",
  "step_not_proven",
] as const;
export const rejectionReasonSchema = z.enum(rejectionReasons);
export type RejectionReason = z.infer<typeof rejectionReasonSchema>;
