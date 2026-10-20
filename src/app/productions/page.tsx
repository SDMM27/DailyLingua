import type { Metadata } from "next";
import { connection } from "next/server";
import { ProductionsView } from "@/components/productions/productions-view";
import { getRepository, getToday, requirePreferences } from "@/lib/data/repository";
import { languageSchema } from "@/lib/schemas/common";

export const metadata: Metadata = { title: "Mes productions" };

export default async function ProductionsPage({ searchParams }: { searchParams: Promise<{ langue?: string }> }) {
  await connection(); // depends on today's date
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const today = await getToday();
  const [{ langue }, entries, cards] = await Promise.all([
    searchParams,
    repo.listProductions(),
    repo.listCorrectionCards(),
  ]);
  // An unknown language is ignored (all languages are shown).
  const parsed = languageSchema.safeParse(langue);

  return (
    <ProductionsView
      entries={entries}
      cards={cards}
      userLanguages={preferences.goals.map((g) => g.language)}
      selected={parsed.success ? parsed.data : undefined}
      today={today}
      persist={!repo.isDemo}
    />
  );
}
