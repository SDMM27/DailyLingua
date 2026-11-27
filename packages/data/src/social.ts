import { appSchema, type AppClient } from "./client";
import { toDataError } from "./errors";

/**
 * The social mechanics (`j7-social.md` lot 3). Every call goes through the signed-in learner's own client: the database
 * functions take the caller from the session, never an id from here, and answer only what that caller is entitled to see.
 */

export type PseudonymStatus = "ok" | "invalid" | "taken" | "exists" | "rate_limited";
export type LeagueJoinStatus = "ok" | "not_enabled" | "no_profile";
export type InviteAcceptStatus = "ok" | "not_enabled" | "no_profile" | "rate_limited" | "invalid" | "self" | "already";
export type InviteCreateStatus = "ok" | "not_enabled" | "no_profile" | "limit";
export type CoopCreateStatus = "ok" | "not_enabled" | "no_profile" | "invalid" | "not_friends" | "exists";
export type CoopJoinStatus = "ok" | "not_enabled" | "unavailable" | "full" | "exists";

export interface LeagueSummary {
  registered: boolean;
  /** Registered but not yet old enough or without a streak of 3 days. */
  eligible: boolean;
  /** `collective` (always today) or `ranked_pending` (16 members or more: the ranked mode is not built). */
  mode: "collective" | "ranked_pending";
  participants: number;
  total: number;
  goal: number;
  mine: number;
  daysLeft: number;
}

export interface Friend {
  pseudonym: string;
  language: string | null;
  weekXp: number;
  streak: number | null;
}

export interface CoopMember {
  pseudonym: string;
  contribution: number;
  me: boolean;
}

export interface CoopChallenge {
  id: string;
  status: "active" | "closed";
  daysLeft: number;
  members: CoopMember[];
  total: number;
  goal: number;
  reached: boolean;
}

export interface CoopOverview {
  enabled: boolean;
  invitations: { id: string; from: string }[];
  challenge: CoopChallenge | null;
}

const asRecord = (value: unknown): Record<string, unknown> => (value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {});
const num = (value: unknown) => (typeof value === "number" ? value : 0);

/** The learner's pseudonym, or null before the first social activation. */
export async function getSocialPseudonym(client: AppClient, userId: string): Promise<string | null> {
  const { data, error } = await appSchema(client).from("social_profile").select("pseudonym").eq("user_id", userId).maybeSingle();
  if (error) throw toDataError(error);
  return data ? data.pseudonym : null;
}

export async function setPseudonym(client: AppClient, pseudonym: string): Promise<PseudonymStatus> {
  const { data, error } = await appSchema(client).rpc("social_set_pseudonym", { p_pseudonym: pseudonym });
  if (error) throw toDataError(error);
  return data as PseudonymStatus;
}

export async function joinLeague(client: AppClient): Promise<LeagueJoinStatus> {
  const { data, error } = await appSchema(client).rpc("league_join");
  if (error) throw toDataError(error);
  return data as LeagueJoinStatus;
}

export async function leaveLeague(client: AppClient): Promise<void> {
  const { error } = await appSchema(client).rpc("league_leave");
  if (error) throw toDataError(error);
}

/** The collective challenge of the week for a member; `registered: false` for anybody else. */
export async function getLeagueSummary(client: AppClient): Promise<LeagueSummary> {
  const { data, error } = await appSchema(client).rpc("league_week_summary");
  if (error) throw toDataError(error);
  const json = asRecord(data);
  return {
    registered: json.registered === true,
    eligible: json.eligible === true,
    mode: json.mode === "ranked_pending" ? "ranked_pending" : "collective",
    participants: num(json.participants),
    total: num(json.total),
    goal: num(json.goal),
    mine: num(json.mine),
    daysLeft: num(json.days_left),
  };
}

export async function listFriends(client: AppClient): Promise<Friend[]> {
  const { data, error } = await appSchema(client).rpc("friends_overview");
  if (error) throw toDataError(error);
  return (data ?? []).map((row) => ({ pseudonym: row.pseudonym, language: row.language, weekXp: row.week_xp, streak: row.streak }));
}

export async function createInvite(client: AppClient): Promise<{ status: InviteCreateStatus; code?: string }> {
  const { data, error } = await appSchema(client).rpc("friend_invite_create");
  if (error) throw toDataError(error);
  const json = asRecord(data);
  return { status: json.status as InviteCreateStatus, code: typeof json.code === "string" ? json.code : undefined };
}

export async function acceptInvite(client: AppClient, code: string): Promise<InviteAcceptStatus> {
  const { data, error } = await appSchema(client).rpc("friend_invite_accept", { p_code: code });
  if (error) throw toDataError(error);
  return data as InviteAcceptStatus;
}

export async function removeFriend(client: AppClient, pseudonym: string): Promise<boolean> {
  const { data, error } = await appSchema(client).rpc("friend_remove", { p_pseudonym: pseudonym });
  if (error) throw toDataError(error);
  return data === true;
}

export async function createCoop(client: AppClient, pseudonyms: string[]): Promise<CoopCreateStatus> {
  const { data, error } = await appSchema(client).rpc("coop_create", { p_pseudonyms: pseudonyms });
  if (error) throw toDataError(error);
  return asRecord(data).status as CoopCreateStatus;
}

export async function joinCoop(client: AppClient, challengeId: string): Promise<CoopJoinStatus> {
  const { data, error } = await appSchema(client).rpc("coop_join", { p_challenge: challengeId });
  if (error) throw toDataError(error);
  return data as CoopJoinStatus;
}

export async function leaveCoop(client: AppClient, challengeId: string): Promise<void> {
  const { error } = await appSchema(client).rpc("coop_leave", { p_challenge: challengeId });
  if (error) throw toDataError(error);
}

export async function getCoopOverview(client: AppClient): Promise<CoopOverview> {
  const { data, error } = await appSchema(client).rpc("coop_overview");
  if (error) throw toDataError(error);
  const json = asRecord(data);
  const challenge = json.challenge === null || json.challenge === undefined ? null : asRecord(json.challenge);
  return {
    enabled: json.enabled === true,
    invitations: Array.isArray(json.invitations) ? json.invitations.map((entry) => ({ id: String(asRecord(entry).id), from: String(asRecord(entry).from) })) : [],
    challenge: challenge && {
      id: String(challenge.id),
      status: challenge.status === "closed" ? "closed" : "active",
      daysLeft: num(challenge.days_left),
      members: Array.isArray(challenge.members)
        ? challenge.members.map((entry) => ({ pseudonym: String(asRecord(entry).pseudonym), contribution: num(asRecord(entry).contribution), me: asRecord(entry).me === true }))
        : [],
      total: num(challenge.total),
      goal: num(challenge.goal),
      reached: challenge.reached === true,
    },
  };
}
