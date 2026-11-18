import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { LicenseLink } from "@/components/reading/content-item";
import { LanguageTag, PageHeader } from "@/components/ui/primitives";
import { getRepository, requirePreferences } from "@/lib/data/repository";
import { CONTENT_TYPE_LABELS } from "@/lib/domain/labels";
import { LANGUAGE_CODES, languageInfo } from "@/lib/domain/languages";
import type { SourceInfo } from "@/lib/schemas/content";

export const metadata: Metadata = { title: "Sources et licences" };

export default async function SourcesPage() {
  await connection();
  const preferences = await requirePreferences();
  const sources = await (await getRepository()).listSources();

  // The user's languages first, then the others in registry order.
  const mine = preferences.goals.map((g) => g.language);
  const order = [...mine, ...LANGUAGE_CODES.filter((l) => !mine.includes(l))];
  const groups = order
    .map((language) => ({ language, sources: sources.filter((s) => s.language === language) }))
    .filter((g) => g.sources.length > 0);

  return (
    <>
      <PageHeader eyebrow={<Link href="/lire">← Lire, regarder, écouter</Link>} title="Sources et licences">
        Daily Lingua ne reproduit pas les articles : il affiche le titre, une courte accroche et un lien vers
        l’éditeur, à partir de ses flux RSS publics. Chaque source garde ses droits ; voici sous quelle licence elle
        publie.
      </PageHeader>

      <div className="grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
        {groups.map(({ language, sources: list }) => (
          <section key={language} aria-labelledby={`sources-${language}`} className="min-w-0">
            <h2 id={`sources-${language}`} className="mb-3">
              <LanguageTag language={language} />
            </h2>
            <ul className="border-t border-ink">
              {list.map((source) => (
                <SourceRow key={source.key} source={source} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function SourceRow({ source }: { source: SourceInfo }) {
  const info = languageInfo(source.language);
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-line py-3">
      <div className="min-w-0">
        <a
          href={source.homepage}
          target="_blank"
          rel="noopener noreferrer"
          lang={source.language}
          dir={info.dir}
          className="font-serif text-lg font-bold hover:underline"
        >
          {source.name}
        </a>
        <p className="text-xs text-muted">
          {CONTENT_TYPE_LABELS[source.contentType]}
          {source.access === "metered" && " · abonnement possible"}
          {source.access === "paywalled" && " · réservé aux abonnés"}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted">
        <LicenseLink license={source.license} />
      </span>
    </li>
  );
}
