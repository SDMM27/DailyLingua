import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PlacementTest } from "@/components/placement/placement-test";
import { alphabetLanguages } from "@/lib/alphabets";
import { readAlphabetDraftPolicy, visibleAlphabet } from "@/lib/alphabets/policy";
import { getRepository, requirePreferences } from "@/lib/data/repository";
import { isAlphabetComplete } from "@/lib/domain/alphabet";
import { placementItems } from "@/lib/placement/banks";

export const metadata: Metadata = { title: "Test de niveau" };

export default async function PlacementPage({ params }: { params: Promise<{ langue: string }> }) {
  await connection();
  const { langue } = await params;
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const goal = preferences.goals.find((g) => g.language === langue);
  if (!goal) notFound();

  // A learner who may not read the script yet is pointed to the alphabet (or its reading check).
  const alphabet = alphabetLanguages().includes(goal.language)
    ? visibleAlphabet(goal.language, readAlphabetDraftPolicy())
    : undefined;
  const cards = alphabet ? (await repo.listAlphabetCards()).filter((c) => c.language === goal.language) : [];
  const needsAlphabet = alphabet && !isAlphabetComplete(alphabet, cards);

  // Only the questions of this language reach the browser, never the whole map of banks.
  return (
    <PlacementTest
      language={goal.language}
      items={placementItems(goal.language)}
      startLevel={goal.level}
      persist={!repo.isDemo}
      alphabet={needsAlphabet ? { script: alphabet.script } : undefined}
    />
  );
}
