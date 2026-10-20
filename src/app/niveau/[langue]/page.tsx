import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PlacementTest } from "@/components/placement/placement-test";
import { getRepository, requirePreferences } from "@/lib/data/repository";
import { placementItems } from "@/lib/placement/banks";

export const metadata: Metadata = { title: "Test de niveau" };

export default async function PlacementPage({ params }: { params: Promise<{ langue: string }> }) {
  await connection();
  const { langue } = await params;
  const repo = await getRepository();
  const preferences = await requirePreferences();
  const goal = preferences.goals.find((g) => g.language === langue);
  if (!goal) notFound();

  // Only the questions of this language reach the browser, never the whole map of banks.
  return (
    <PlacementTest
      language={goal.language}
      items={placementItems(goal.language)}
      startLevel={goal.level}
      persist={!repo.isDemo}
    />
  );
}
