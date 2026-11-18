import { z } from "zod";

/** Version of the XP scale written in `xp_ledger.rule_version` (`j2-jeu-xp-serie.md` §1). */
export const RULE_VERSION = "j2.1";

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
] as const;
export const xpZeroReasonSchema = z.enum(xpZeroReasons);
export type XpZeroReason = z.infer<typeof xpZeroReasonSchema>;

/**
 * Permanent refusals of an event (`RejectedDelivery.reason`). The first seven are those of
 * `j2-architecture.md` §2, `before_served` is from `j2-jeu-xp-serie.md` §2.3; `unknown_item` and
 * `unknown_correction` are added for items, texts and corrections the server does not know. `server_refused` is
 * the server's own: the batch the event was in was refused by SQL for good and the event still failed when
 * replayed alone (`j2-pr1-lot-w.md`, D9).
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
] as const;
export const rejectionReasonSchema = z.enum(rejectionReasons);
export type RejectionReason = z.infer<typeof rejectionReasonSchema>;
