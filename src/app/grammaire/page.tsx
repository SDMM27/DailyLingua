import type { Metadata } from "next";
import { connection } from "next/server";
import { GrammarView } from "@/components/grammar/grammar-view";
import { getRepository, getToday, requirePreferences } from "@/lib/data/repository";
import { suggestGrammarPoints } from "@/lib/domain/grammar-suggestions";
import { readAlphabetDraftPolicy, visibleAlphabet } from "@/lib/alphabets/policy";
import { grammarLanguages } from "@/lib/grammar/courses";
import { readGrammarDraftPolicy, visibleGrammarPoints } from "@/lib/grammar/policy";
import { languageSchema } from "@/lib/schemas/common";

export const metadata: Metadata = { title: "Grammaire" };

export default async function GrammarPage({ searchParams }: { searchParams: Promise<{ langue?: string }> }) {
  await connection(); // depends on today's date
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const today = await getToday();
  const [{ langue }, cards, entries] = await Promise.all([
    searchParams,
    repo.listGrammarCards(),
    repo.listProductions(),
  ]);

  const goals = preferences.goals;
  const userLanguages = goals.map((g) => g.language);
  const policy = readGrammarDraftPolicy();
  // An unknown or foreign language is ignored: the first language of the user that has a course.
  const parsed = languageSchema.safeParse(langue);
  const withCourse = grammarLanguages().filter((l) => visibleGrammarPoints(l, policy).length > 0);
  const language =
    parsed.success && userLanguages.includes(parsed.data)
      ? parsed.data
      : (userLanguages.find((l) => withCourse.includes(l)) ?? userLanguages[0]);
  const goal = goals.find((g) => g.language === language)!;
  const points = visibleGrammarPoints(language, policy);
  const languageCards = cards.filter((c) => c.language === language);

  return (
    <GrammarView
      userLanguages={userLanguages}
      language={language}
      points={points}
      cards={languageCards}
      suggestions={suggestGrammarPoints({ language, entries, points, cards: languageCards, level: goal.level, today })}
      level={goal.level}
      today={today}
      hasAlphabet={visibleAlphabet(language, readAlphabetDraftPolicy()) !== undefined}
    />
  );
}
