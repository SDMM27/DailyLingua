import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AlphabetView } from "@/components/alphabet/alphabet-view";
import { PageHeader } from "@/components/ui/primitives";
import { alphabetLanguages } from "@/lib/alphabets";
import { readAlphabetDraftPolicy, visibleAlphabet } from "@/lib/alphabets/policy";
import { getRepository, getToday, requirePreferences } from "@/lib/data/repository";
import { languageSchema } from "@/lib/schemas/common";

export const metadata: Metadata = { title: "Alphabet" };

export default async function AlphabetPage({ searchParams }: { searchParams: Promise<{ langue?: string }> }) {
  await connection(); // depends on today's date
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const today = await getToday();
  const [{ langue }, cards] = await Promise.all([searchParams, repo.listAlphabetCards()]);

  const policy = readAlphabetDraftPolicy();
  // The languages the user studies that have a visible alphabet.
  const studied = preferences.goals
    .map((g) => g.language)
    .filter((l) => alphabetLanguages().includes(l) && visibleAlphabet(l, policy));
  const parsed = languageSchema.safeParse(langue);
  const language = parsed.success && studied.includes(parsed.data) ? parsed.data : studied[0];
  const alphabet = language ? visibleAlphabet(language, policy) : undefined;

  if (!language || !alphabet) {
    return (
      <>
        <PageHeader eyebrow="Alphabet" title="Alphabet" />
        <p className="py-8 text-center text-sm text-muted">
          Aucune de tes langues n’a encore d’alphabet à apprendre ici.{" "}
          <Link href="/" className="font-medium text-ink underline underline-offset-2">
            Retour à l’accueil
          </Link>
        </p>
      </>
    );
  }

  return (
    <AlphabetView
      userLanguages={studied}
      language={language}
      alphabet={alphabet}
      cards={cards.filter((c) => c.language === language)}
      today={today}
    />
  );
}
