import type { Metadata } from "next";
import { connection } from "next/server";
import { ProductionsView } from "@/components/productions/productions-view";
import { getRepository, getToday, requirePreferences } from "@/lib/data/repository";
import { suggestGrammarPoints, type GrammarSuggestion } from "@/lib/domain/grammar-suggestions";
import { readGrammarDraftPolicy, visibleGrammarPoints } from "@/lib/grammar/policy";
import { languageSchema, type Language } from "@/lib/schemas/common";

export const metadata: Metadata = { title: "Mes productions" };

export default async function ProductionsPage({ searchParams }: { searchParams: Promise<{ langue?: string }> }) {
  await connection(); // depends on today's date
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const today = await getToday();
  const [{ langue }, entries, cards, grammarCards] = await Promise.all([
    searchParams,
    repo.listProductions(),
    repo.listCorrectionCards(),
    repo.listGrammarCards(),
  ]);
  // An unknown language is ignored (all languages are shown).
  const parsed = languageSchema.safeParse(langue);

  // Grammar points to work on, for each language of the user that has a visible course.
  const policy = readGrammarDraftPolicy();
  const grammarSuggestions: Partial<Record<Language, GrammarSuggestion[]>> = {};
  for (const { language, level } of preferences.goals) {
    const points = visibleGrammarPoints(language, policy);
    if (points.length === 0) continue;
    grammarSuggestions[language] = suggestGrammarPoints({
      language,
      entries,
      points,
      cards: grammarCards.filter((c) => c.language === language),
      level,
      today,
    });
  }

  return (
    <ProductionsView
      entries={entries}
      cards={cards}
      userLanguages={preferences.goals.map((g) => g.language)}
      selected={parsed.success ? parsed.data : undefined}
      today={today}
      grammarSuggestions={grammarSuggestions}
      persist={!repo.isDemo}
    />
  );
}
