import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { GrammarPointView } from "@/components/grammar/grammar-point-view";
import { getRepository, getToday } from "@/lib/data/repository";
import { findVisibleGrammarPoint, readGrammarDraftPolicy } from "@/lib/grammar/policy";

type Params = Promise<{ langue: string; point: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { langue, point: id } = await params;
  const found = findVisibleGrammarPoint(id, readGrammarDraftPolicy());
  return { title: found && found.language === langue ? found.point.title : "Grammaire" };
}

export default async function GrammarPointPage({ params }: { params: Params }) {
  await connection(); // depends on today's date
  const { langue, point: id } = await params;
  const found = findVisibleGrammarPoint(id, readGrammarDraftPolicy());
  if (!found || found.language !== langue) notFound();

  const repo = await getRepository();
  const [today, cards] = await Promise.all([getToday(), repo.listGrammarCards()]);

  // Only this point reaches the browser, never the whole course.
  return (
    <GrammarPointView
      point={found.point}
      language={found.language}
      card={cards.find((c) => c.pointId === found.point.id)}
      today={today}
      persist={!repo.isDemo}
    />
  );
}
