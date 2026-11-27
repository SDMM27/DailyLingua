"use server";

import {
  acceptInvite, createCoop, createInvite, joinCoop, joinLeague, leaveCoop, leaveLeague, removeFriend, saveGameSettings, setPseudonym,
} from "@dailylingua/data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { saveErrorKey } from "@/lib/data-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Answer of a social action: the status the database gave (a word the screen maps to a message) or a failure. */
export type SocialResult = { status: string; code?: string } | { error: "generic" | "unauthenticated" | "invalid" | "tooManyRequests" | "conflict" | "notFound" };

/** The pseudonym: 3 to 20 characters, letters (any alphabet), digits, space and hyphen; the database checks it again. */
const pseudonymSchema = z.string().trim().regex(/^[\p{L}\p{N}][\p{L}\p{N} -]{2,19}$/u);
const codeSchema = z.string().trim().min(6).max(24);
const idSchema = z.uuid();

/** Each action signs in with its own client: the functions of the database read the caller from the session. */
async function signedInClient() {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/sign-in");
  return client;
}

async function run(task: (client: Awaited<ReturnType<typeof signedInClient>>) => Promise<SocialResult>): Promise<SocialResult> {
  const client = await signedInClient();
  try {
    const result = await task(client);
    revalidatePath("/social");
    return result;
  } catch (error) {
    console.error("A social action failed", error);
    return { error: saveErrorKey(error) as "generic" };
  }
}

/** First activation: the pseudonym, then the two opt-ins the learner chose. Nothing is switched on that was not asked for. */
export async function activateSocial(input: { pseudonym: string; league: boolean; friends: boolean }): Promise<SocialResult> {
  const pseudonym = pseudonymSchema.safeParse(input.pseudonym);
  if (!pseudonym.success) return { error: "invalid" };
  return run(async (client) => {
    const status = await setPseudonym(client, pseudonym.data);
    if (status !== "ok" && status !== "exists") return { status };
    await saveGameSettings(client, { league: { enabled: input.league }, friends: { enabled: input.friends } });
    if (input.league) await joinLeague(client);
    return { status: "ok" };
  });
}

/** Turns the collective challenge on (and joins it) or off (which also ends the membership). */
export async function setLeague(on: boolean): Promise<SocialResult> {
  return run(async (client) => {
    await saveGameSettings(client, { league: { enabled: on } });
    if (!on) {
      await leaveLeague(client);
      return { status: "ok" };
    }
    return { status: await joinLeague(client) };
  });
}

/** Turns the friends on or off; off, the learner leaves the challenges and disappears from the lists of their friends. */
export async function setFriends(on: boolean): Promise<SocialResult> {
  return run(async (client) => {
    await saveGameSettings(client, { friends: { enabled: on } });
    return { status: "ok" };
  });
}

export async function createInviteCode(): Promise<SocialResult> {
  return run(async (client) => {
    const { status, code } = await createInvite(client);
    return { status, code };
  });
}

export async function acceptInviteCode(code: string): Promise<SocialResult> {
  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) return { status: "invalid" };
  return run(async (client) => ({ status: await acceptInvite(client, parsed.data) }));
}

export async function removeFriendByPseudonym(pseudonym: string): Promise<SocialResult> {
  const parsed = pseudonymSchema.safeParse(pseudonym);
  if (!parsed.success) return { error: "invalid" };
  return run(async (client) => ({ status: (await removeFriend(client, parsed.data)) ? "ok" : "unavailable" }));
}

export async function startCoop(pseudonyms: string[]): Promise<SocialResult> {
  const parsed = z.array(pseudonymSchema).min(1).max(4).safeParse(pseudonyms);
  if (!parsed.success) return { error: "invalid" };
  return run(async (client) => ({ status: await createCoop(client, parsed.data) }));
}

export async function joinCoopChallenge(challengeId: string): Promise<SocialResult> {
  const id = idSchema.safeParse(challengeId);
  if (!id.success) return { error: "invalid" };
  return run(async (client) => ({ status: await joinCoop(client, id.data) }));
}

/** Leaves a challenge, or declines an invitation: no penalty, no trace for the others. */
export async function leaveCoopChallenge(challengeId: string): Promise<SocialResult> {
  const id = idSchema.safeParse(challengeId);
  if (!id.success) return { error: "invalid" };
  return run(async (client) => {
    await leaveCoop(client, id.data);
    return { status: "ok" };
  });
}
