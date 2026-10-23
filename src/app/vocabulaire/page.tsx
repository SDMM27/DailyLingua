import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/ui/primitives";
import { RetentionCard } from "@/components/vocabulary/retention-card";
import { VocabularyView } from "@/components/vocabulary/vocabulary-view";
import { getRepository, getToday, requirePreferences } from "@/lib/data/repository";
import { dueToday } from "@/lib/domain/spaced-repetition";

export const metadata: Metadata = { title: "Vocabulaire" };

export default async function VocabularyPage() {
  await connection();
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const today = await getToday();
  const [items, lists, retention] = await Promise.all([
    repo.listVocabulary(),
    repo.listVocabularyLists(),
    repo.vocabularyRetention(),
  ]);
  const learning = items.filter((i) => i.status === "learning").length;

  return (
    <>
      <PageHeader eyebrow="Vocabulaire" title="Mes mots">
        {learning} en cours d’apprentissage, {items.length - learning} connus ·{" "}
        {dueToday(items, today, lists).length} à revoir aujourd’hui.
      </PageHeader>
      <VocabularyView
        initialItems={items}
        initialLists={lists}
        languages={preferences.goals.map((g) => g.language)}
        today={today}
        persist={!repo.isDemo}
        canTranslate={repo.canTranslateVocabulary}
        isGuest={repo.isGuest}
      />
      <div className="mt-10">
        <RetentionCard stats={retention} />
      </div>
    </>
  );
}
