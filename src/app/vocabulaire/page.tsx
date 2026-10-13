import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/ui/primitives";
import { VocabularyView } from "@/components/vocabulary/vocabulary-view";
import { getRepository, getToday } from "@/lib/data/repository";
import { dueToday } from "@/lib/domain/spaced-repetition";

export const metadata: Metadata = { title: "Vocabulaire" };

export default async function VocabularyPage() {
  await connection();
  const repo = await getRepository();
  const today = await getToday();
  const [items, preferences] = await Promise.all([repo.listVocabulary(), repo.getPreferences()]);
  const learning = items.filter((i) => i.status === "learning").length;

  return (
    <>
      <PageHeader eyebrow="Vocabulaire" title="Mes mots">
        {learning} en cours d’apprentissage, {items.length - learning} connus ·{" "}
        {dueToday(items, today).length} à revoir aujourd’hui.
      </PageHeader>
      <VocabularyView
        initialItems={items}
        languages={preferences.goals.map((g) => g.language)}
        today={today}
      />
    </>
  );
}
