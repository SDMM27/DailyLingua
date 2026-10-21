import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ContentItem } from "@/components/reading/content-item";
import { languageStyle } from "@/components/ui/language-style";
import { Card, DemoNotice, PageHeader } from "@/components/ui/primitives";
import { getRepository, requirePreferences } from "@/lib/data/repository";
import { languageInfo } from "@/lib/domain/languages";
import type { ContentType, Language } from "@/lib/schemas/common";

export const metadata: Metadata = { title: "Lire, regarder, écouter" };

/** Items per language when every language is shown, and when one is selected. */
const PER_LANGUAGE_ALL = 8;
const PER_LANGUAGE_ONE = 30;

/** Type filter: the query value, its chip label and the content type it keeps. Interviews only show under « Tout ». */
const TYPE_FILTERS = [
  { value: "article", label: "Lire", type: "article" },
  { value: "video", label: "Regarder", type: "video" },
  { value: "podcast", label: "Écouter", type: "podcast" },
] as const satisfies readonly { value: string; label: string; type: ContentType }[];

/** `/lire` with the given filters; a missing filter is left out of the query string. */
function readingHref(langue: Language | undefined, type: string | undefined): string {
  const params = new URLSearchParams();
  if (langue) params.set("langue", langue);
  if (type) params.set("type", type);
  const query = params.toString();
  return query ? `/lire?${query}` : "/lire";
}

export default async function ReadingPage({
  searchParams,
}: {
  searchParams: Promise<{ langue?: string; type?: string }>;
}) {
  await connection();
  const preferences = await requirePreferences();
  const repository = await getRepository();
  const languages = preferences.goals.map((g) => g.language);
  const { langue, type } = await searchParams;
  const selected = languages.find((l) => l === langue);
  const selectedType = TYPE_FILTERS.find((f) => f.value === type);

  const items = await repository.listContents(
    selected ? [selected] : languages,
    selected ? PER_LANGUAGE_ONE : PER_LANGUAGE_ALL,
    selectedType ? { types: [selectedType.type] } : undefined,
  );
  // Newest first across languages; undated items last.
  items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  const now = new Date();

  return (
    <>
      <PageHeader eyebrow="Contenus authentiques" title="Lire, regarder, écouter">
        Les dernières parutions de sources fiables dans tes langues. Tu lis ou écoutes chez l’éditeur ; les
        vidéos YouTube se regardent aussi ici, et les podcasts s’écoutent ici quand l’éditeur le permet. Seuls le titre, une courte accroche et le lien sont repris.
      </PageHeader>

      {repository.isDemo && (
        <DemoNotice>
          Mode démonstration : titres et résumés d’exemple, les liens mènent à l’accueil des sources réelles.
        </DemoNotice>
      )}

      {languages.length > 1 && (
        <nav aria-label="Filtrer par langue" className="-mx-4 mb-4 overflow-x-auto px-4">
          <ul className="flex gap-2">
            <FilterChip href={readingHref(undefined, selectedType?.value)} active={!selected} label="Toutes" />
            {languages.map((language) => (
              <FilterChip
                key={language}
                href={readingHref(language, selectedType?.value)}
                active={selected === language}
                label={languageInfo(language).nameFr}
                language={language}
              />
            ))}
          </ul>
        </nav>
      )}

      <nav aria-label="Filtrer par type" className="-mx-4 mb-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          <FilterChip href={readingHref(selected, undefined)} active={!selectedType} label="Tout" />
          {TYPE_FILTERS.map((filter) => (
            <FilterChip
              key={filter.value}
              href={readingHref(selected, filter.value)}
              active={selectedType?.value === filter.value}
              label={filter.label}
            />
          ))}
        </ul>
      </nav>

      {items.length === 0 ? (
        <Card className="text-center">
          {selectedType ? (
            <>
              <p className="text-sm text-ink-soft">Rien à {selectedType.label.toLowerCase()} pour l’instant.</p>
              <p className="mt-1 text-xs text-muted">
                Essaie une autre langue, ou « Tout » : toutes les langues n’ont pas encore de source de ce type.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-soft">Aucun contenu pour l’instant.</p>
              <p className="mt-1 text-xs text-muted">
                Les flux n’ont pas encore été relevés. En local : <code>npm run content:ingest</code>.
              </p>
            </>
          )}
        </Card>
      ) : (
        <Card className="py-1 sm:py-2">
          {items.map((item) => (
            <ContentItem key={item.id} item={item} now={now} timeZone={preferences.timeZone} />
          ))}
        </Card>
      )}

      <p className="mt-6 text-center text-xs text-muted">
        <Link href="/lire/sources" className="underline underline-offset-2 hover:text-ink">
          Sources et licences
        </Link>
      </p>
    </>
  );
}

function FilterChip({
  href,
  active,
  label,
  language,
}: {
  href: string;
  active: boolean;
  label: string;
  language?: Language;
}) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${
          active ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink-soft"
        }`}
      >
        {language && <span className={`size-1.5 rounded-full ${languageStyle(language).bg}`} aria-hidden="true" />}
        {label}
      </Link>
    </li>
  );
}
