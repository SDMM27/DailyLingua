import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AlphabetGroupView } from "@/components/alphabet/alphabet-group-view";
import { findVisibleAlphabetGroup, readAlphabetDraftPolicy } from "@/lib/alphabets/policy";
import { getRepository, getToday } from "@/lib/data/repository";
import { buildAlphabetExercises } from "@/lib/domain/alphabet";

type Params = Promise<{ langue: string; groupe: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { langue, groupe } = await params;
  const found = findVisibleAlphabetGroup(groupe, readAlphabetDraftPolicy());
  return { title: found && found.language === langue ? found.group.title : "Alphabet" };
}

export default async function AlphabetGroupPage({ params }: { params: Params }) {
  await connection(); // depends on today's date
  const { langue, groupe } = await params;
  const found = findVisibleAlphabetGroup(groupe, readAlphabetDraftPolicy());
  if (!found || found.language !== langue) notFound();

  const repo = await getRepository();
  const [today, cards] = await Promise.all([getToday(), repo.listAlphabetCards()]);
  const { alphabet, group } = found;

  // Only this group reaches the browser, never the whole alphabet. The seed fixes the run for the day.
  return (
    <AlphabetGroupView
      group={group}
      letters={group.letters.flatMap((c) => alphabet.letters.filter((l) => l.lower === c))}
      exercises={buildAlphabetExercises(alphabet, group.id, `${group.id}:${today}`)}
      language={found.language}
      card={cards.find((c) => c.groupId === group.id)}
      today={today}
      persist={!repo.isDemo}
      draft={alphabet.reviewedOn === null}
    />
  );
}
