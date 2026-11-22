"use server";

import { deterministicUuid } from "@dailylingua/core";
import { getProfile, listEnrollments, readReaderText, saveReaderCard } from "@dailylingua/data";
import { z } from "zod";
import { readerWords } from "@/lib/reader/words";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const selection = z.object({ textId: z.uuid(), from: z.int().min(0).max(7999) });

export async function addReaderCard(input: { textId: string; from: number }): Promise<boolean> {
  const parsed = selection.safeParse(input);
  if (!parsed.success) return false;
  const client = await createSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return false;
  try {
    const [text, profile, enrollments] = await Promise.all([
      readReaderText(client, parsed.data.textId), getProfile(client), listEnrollments(client),
    ]);
    if (!text || !profile || !enrollments.some(({ language }) => language === text.language)) return false;
    const word = readerWords(text.body, text.new_words, text.language, profile.nativeLanguage)
      .find(({ from }) => from === parsed.data.from);
    if (!word) return false;
    await saveReaderCard(getSupabaseServiceClient(), {
      id: deterministicUuid(`reader-card:${user.id}:${text.id}:${word.from}`),
      userId: user.id, language: text.language, front: word.front, back: word.meaning,
      backLanguage: word.meaningLanguage, context: word.context, textId: text.id, from: word.from,
    });
    return true;
  } catch (error) {
    console.error("addReaderCard failed", error);
    return false;
  }
}
