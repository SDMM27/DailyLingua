import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { languageStyle } from "@/components/ui/language-style";
import { Card, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { ALPHABET_SCRIPT_NAMES, isAlphabetComplete } from "@/lib/domain/alphabet";
import { grammarPointState } from "@/lib/domain/grammar";
import { languageInfo } from "@/lib/domain/languages";
import { dueItems, relativeDueLabel } from "@/lib/domain/spaced-repetition";
import type { Alphabet, AlphabetCard, AlphabetGroup } from "@/lib/schemas/alphabet";
import type { DateKey, Language } from "@/lib/schemas/common";
import type { GrammarPointState } from "@/lib/schemas/grammar";

const STATE_LABELS: Record<GrammarPointState, string> = {
  new: "À voir",
  practised: "Exercé",
  mastered: "Maîtrisé",
};

/**
 * "Alphabet": the groups of letters to review today, then every group in teaching order, the next
 * new one suggested. `alphabet` is a visible one (the page applies the draft policy) and `cards`
 * are the cards of its language.
 */
export function AlphabetView({
  userLanguages,
  language,
  alphabet,
  cards,
  today,
}: {
  /** Languages of the learner that have a visible alphabet. */
  userLanguages: Language[];
  language: Language;
  alphabet: Alphabet;
  cards: AlphabetCard[];
  today: DateKey;
}) {
  const cardOf = (group: AlphabetGroup) => cards.find((c) => c.groupId === group.id);
  const dueCards = dueItems(cards, today).filter((c) => alphabet.groups.some((g) => g.id === c.groupId));
  const next = alphabet.groups.find((g) => !cardOf(g));

  return (
    <>
      <PageHeader eyebrow="Alphabet" title="Alphabet">
        Les lettres par petits groupes, avec des mots à lire et à écouter. Un groupe réussi rejoint tes révisions.
      </PageHeader>

      {userLanguages.length > 1 && (
        <nav aria-label="Choisir une langue" className="-mx-4 mb-6 overflow-x-auto px-4">
          <ul className="flex gap-2">
            {userLanguages.map((l) => (
              <li key={l} className="shrink-0">
                <Link
                  href={`/alphabet?langue=${l}`}
                  aria-current={l === language ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium ${
                    l === language ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink-soft"
                  }`}
                >
                  <span className={`size-2 rounded-full ${languageStyle(l).bg}`} aria-hidden="true" />
                  {languageInfo(l).nameFr}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="space-y-10">
        <section aria-label="À revoir aujourd’hui">
          <SectionTitle>À revoir aujourd’hui</SectionTitle>
          {dueCards.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-soft">Aucun groupe à revoir aujourd’hui.</p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {dueCards.map((card) => (
                <li key={card.id}>
                  <GroupRow
                    group={alphabet.groups.find((g) => g.id === card.groupId)!}
                    alphabet={alphabet}
                    language={language}
                    card={card}
                    today={today}
                    highlight
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {!isAlphabetComplete(alphabet, cards) && (
          <Card className="flex items-center justify-between gap-3 !p-4">
            <p className="text-[15px] font-medium">Tu lis déjà {ALPHABET_SCRIPT_NAMES[alphabet.script]} ?</p>
            <Link
              href={`/alphabet/${language}/test`}
              className="flex min-h-11 shrink-0 items-center text-sm font-semibold underline underline-offset-2"
            >
              Faire le test de lecture
            </Link>
          </Card>
        )}

        <section aria-label="Les groupes de lettres">
          <SectionTitle
            action={
              alphabet.reviewedOn === null ? (
                <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted">
                  Non relu
                </span>
              ) : undefined
            }
          >
            {languageInfo(language).nameFr}
          </SectionTitle>
          <ol className="space-y-2">
            {alphabet.groups.map((group) => (
              <li key={group.id}>
                <GroupRow
                  group={group}
                  alphabet={alphabet}
                  language={language}
                  card={cardOf(group)}
                  today={today}
                  suggested={group === next}
                />
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}

function GroupRow({
  group,
  alphabet,
  language,
  card,
  today,
  highlight = false,
  suggested = false,
}: {
  group: AlphabetGroup;
  alphabet: Alphabet;
  language: Language;
  card?: AlphabetCard;
  today: DateKey;
  highlight?: boolean;
  suggested?: boolean;
}) {
  const state = grammarPointState(card);
  const style = languageStyle(language);
  return (
    <Link
      href={`/alphabet/${language}/${group.id}`}
      className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors hover:bg-surface-sunk ${
        highlight || suggested ? `${style.softBg} border-transparent` : "border-line bg-surface"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{group.title}</span>
        <span lang={language} dir={languageInfo(language).dir} className="mt-1 block text-left font-serif text-lg tracking-wide text-ink-soft">
          {group.letters.map((char) => alphabet.letters.find((l) => l.lower === char)?.display ?? char).join(" ")}
        </span>
        <span className="block text-xs text-muted">{group.summary}</span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              state === "mastered"
                ? "bg-success-soft text-success"
                : state === "practised"
                  ? `${style.softBg} ${style.text}`
                  : "bg-surface-sunk text-ink-soft"
            }`}
          >
            {STATE_LABELS[state]}
          </span>
          {suggested && <span className={`text-[11px] font-semibold ${style.text}`}>À découvrir ensuite</span>}
          {card && <span className="text-[11px] text-muted">Révision {relativeDueLabel(card.review.dueOn, today)}</span>}
        </span>
      </span>
      <ArrowRightIcon width={16} height={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
