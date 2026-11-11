import Link from "next/link";
import { languageStyle } from "@/components/ui/language-style";
import { PageHeader, SectionTitle } from "@/components/ui/primitives";
import { RuledList, ruledItem } from "@/components/ui/ruled-grid";
import { ALPHABET_SCRIPT_NAMES, isAlphabetComplete } from "@/lib/domain/alphabet";
import { grammarPointState } from "@/lib/domain/grammar";
import { languageInfo } from "@/lib/domain/languages";
import { toRoman } from "@/lib/domain/roman";
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
        <nav aria-label="Choisir une langue" className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
            <p className="font-serif text-lg italic text-ink-soft">Aucun groupe à revoir aujourd’hui.</p>
          ) : (
            <RuledList>
              {dueCards.map((card, index) => (
                <li key={card.id} className={ruledItem}>
                  <GroupRow
                    group={alphabet.groups.find((g) => g.id === card.groupId)!}
                    alphabet={alphabet}
                    language={language}
                    card={card}
                    today={today}
                    n={index + 1}
                    highlight
                  />
                </li>
              ))}
            </RuledList>
          )}
        </section>

        {!isAlphabetComplete(alphabet, cards) && (
          <div className="flex flex-wrap items-center justify-between gap-x-6 border-y border-ink py-2">
            <p className="font-serif text-xl font-bold italic">Tu lis déjà {ALPHABET_SCRIPT_NAMES[alphabet.script]} ?</p>
            <Link
              href={`/alphabet/${language}/test`}
              className="flex min-h-11 shrink-0 items-center text-sm font-semibold text-accent-strong underline underline-offset-2"
            >
              Faire le test de lecture
            </Link>
          </div>
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
          <RuledList ordered>
            {alphabet.groups.map((group, index) => (
              <li key={group.id} className={ruledItem}>
                <GroupRow
                  group={group}
                  alphabet={alphabet}
                  language={language}
                  card={cardOf(group)}
                  today={today}
                  suggested={group === next}
                  n={index + 1}
                />
              </li>
            ))}
          </RuledList>
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
  n,
}: {
  group: AlphabetGroup;
  alphabet: Alphabet;
  language: Language;
  card?: AlphabetCard;
  today: DateKey;
  highlight?: boolean;
  suggested?: boolean;
  /** Rank in its list, written as a roman numeral. */
  n: number;
}) {
  const state = grammarPointState(card);
  const style = languageStyle(language);
  return (
    <Link
      href={`/alphabet/${language}/${group.id}`}
      className={`group -m-3 flex min-h-11 items-start gap-4 rounded-xl p-3 transition-colors hover:bg-surface-sunk ${
        highlight || suggested ? "bg-surface-sunk" : ""
      }`}
    >
      <span aria-hidden="true" className="w-8 shrink-0 font-serif text-2xl leading-none font-extrabold text-accent-strong">
        {toRoman(n)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-xl leading-tight font-bold group-hover:underline">{group.title}</span>
        <span lang={language} dir={languageInfo(language).dir} className="sd-display mt-2 block text-left text-3xl leading-tight tracking-wide">
          {group.letters.map((char) => alphabet.letters.find((l) => l.lower === char)?.display ?? char).join(" ")}
        </span>
        <span className="mt-1 block text-sm text-ink-soft">{group.summary}</span>
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
    </Link>
  );
}
