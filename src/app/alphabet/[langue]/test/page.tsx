import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AlphabetCheck } from "@/components/alphabet/alphabet-check";
import { readAlphabetDraftPolicy, visibleAlphabet } from "@/lib/alphabets/policy";
import { getRepository, getToday, requirePreferences } from "@/lib/data/repository";
import { buildAlphabetCheck } from "@/lib/domain/alphabet";
import { languageSchema } from "@/lib/schemas/common";

export const metadata: Metadata = { title: "Test de lecture" };

export default async function AlphabetCheckPage({ params }: { params: Promise<{ langue: string }> }) {
  await connection(); // depends on today's date
  const { langue } = await params;
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const language = languageSchema.safeParse(langue);
  if (!language.success || !preferences.goals.some((g) => g.language === language.data)) notFound();
  const alphabet = visibleAlphabet(language.data, readAlphabetDraftPolicy());
  if (!alphabet) notFound();

  const today = await getToday();
  // The seed fixes the check for the day; the server rebuilds it to grade the answers.
  return (
    <AlphabetCheck
      exercises={buildAlphabetCheck(alphabet, `check:${today}`)}
      day={today}
      language={language.data}
      script={alphabet.script}
      firstGroupId={alphabet.groups[0].id}
      persist={!repo.isDemo}
    />
  );
}
