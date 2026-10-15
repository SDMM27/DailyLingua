import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { PageHeader } from "@/components/ui/primitives";
import { getRepository } from "@/lib/data/repository";
import { isInternalPath } from "@/lib/schemas/feedback";

export const metadata: Metadata = { title: "Envoyer un retour" };

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ depuis?: string }> }) {
  const [repo, { depuis }] = await Promise.all([getRepository(), searchParams]);
  // Only a path of this app is kept (it is stored with the feedback to say where it was sent from).
  const page = depuis && isInternalPath(depuis) ? depuis : undefined;
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow="Bêta" title="Envoyer un retour">
        Un bug, une idée, un contenu qui ne convient pas ? Dis-le en quelques mots, ton message arrive directement à l’éditeur de l’app.
      </PageHeader>
      <FeedbackForm persist={!repo.isDemo} page={page} />
    </div>
  );
}
