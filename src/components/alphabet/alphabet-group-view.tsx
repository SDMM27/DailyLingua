import Link from "next/link";
import { languageStyle } from "@/components/ui/language-style";
import { ListenButton } from "@/components/ui/listen-button";
import { Eyebrow, LanguageTag } from "@/components/ui/primitives";
import { RuledList, ruledItem } from "@/components/ui/ruled-grid";
import { letterLabel } from "@/lib/domain/alphabet";
import { languageInfo } from "@/lib/domain/languages";
import { stripStress } from "@/lib/domain/stress";
import type { AlphabetCard, AlphabetExercise, AlphabetGroup, AlphabetLetter } from "@/lib/schemas/alphabet";
import type { DateKey, Language } from "@/lib/schemas/common";
import { AlphabetPractice } from "./alphabet-practice";

/** One group of letters: a card per letter, the group's tip, then the generated exercises. */
export function AlphabetGroupView({
  group,
  letters,
  exercises,
  language,
  card,
  today,
  persist,
  draft,
}: {
  group: AlphabetGroup;
  /** The letters of the group, in teaching order. */
  letters: AlphabetLetter[];
  exercises: AlphabetExercise[];
  language: Language;
  card?: AlphabetCard;
  today: DateKey;
  persist: boolean;
  /** The alphabet has not been reviewed by a native speaker yet. */
  draft: boolean;
}) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href={`/alphabet?langue=${language}`}
          className="min-h-11 content-center text-sm font-medium text-muted hover:text-ink"
        >
          ← Alphabet
        </Link>
        <div className="flex items-center gap-2">
          <LanguageTag language={language} />
          {draft && (
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted">
              Non relu
            </span>
          )}
        </div>
      </div>

      <header className="mb-8 border-b border-ink pb-6">
        <Eyebrow className="mb-3">Lettres</Eyebrow>
        <h1 className="sd-display text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02] text-balance">{group.title}</h1>
        <p className="mt-3 max-w-[68ch] font-serif text-lg leading-relaxed text-ink-soft">{group.summary}</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-0">
        <div className="min-w-0 space-y-8 lg:pr-10">
          <RuledList aria-label="Les lettres du groupe" columns={2} className="border-t border-line">
            {letters.map((letter) => (
              <li key={letter.lower} className={ruledItem}>
                <LetterCard letter={letter} language={language} />
              </li>
            ))}
          </RuledList>

          {group.tip && (
            <section className="max-w-[68ch] border-y border-ink py-4">
              <Eyebrow>À retenir</Eyebrow>
              <p className="mt-2 font-serif text-lg leading-relaxed">
                <span className="sd-mark">{group.tip}</span>
              </p>
            </section>
          )}
        </div>

        <aside className="min-w-0 border-t border-ink pt-6 lg:border-t-0 lg:border-l lg:border-line lg:pt-0 lg:pl-10">
          {/* Remounted per group: the exercise state belongs to it. */}
          <AlphabetPractice
            key={group.id}
            groupId={group.id}
            exercises={exercises}
            language={language}
            card={card}
            today={today}
            persist={persist}
          />
        </aside>
      </div>
    </div>
  );
}

const FORM_LABELS = [
  ["initial", "début"],
  ["medial", "milieu"],
  ["final", "fin"],
] as const;

function LetterCard({ letter, language }: { letter: AlphabetLetter; language: Language }) {
  const style = languageStyle(language);
  const dir = languageInfo(language).dir;
  const forms = FORM_LABELS.flatMap(([key, label]) => (letter.forms?.[key] ? [{ label, shape: letter.forms[key] }] : []));
  return (
    <article>
      <div className="flex items-start gap-4">
        <p lang={language} dir={dir} aria-label={`Lettre ${letterLabel(letter)}`} className={`sd-display shrink-0 text-7xl leading-none ${style.text}`}>
          {letter.display ? (
            <span>{letter.display}</span>
          ) : letter.upper === letter.lower ? (
            <span>{letter.lower}</span>
          ) : (
            <>
              <span>{letter.upper}</span> <span>{letter.lower}</span>
            </>
          )}
        </p>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            Nom : <span lang={language} dir={dir} className="font-serif text-base text-ink">{letter.name}</span>
          </p>
          <p className="mt-0.5 text-sm text-muted">
            Transcription : <span className="font-semibold text-ink">{letter.latin}</span>
          </p>
          {letter.latinFinal && (
            <p className="mt-0.5 text-sm text-muted">
              En fin de syllabe :{" "}<span className="font-semibold text-ink">{letter.latinFinal}</span>
            </p>
          )}
          {letter.silentInitial && <p className="mt-0.5 text-sm text-muted">Muet en début de syllabe</p>}
        </div>
      </div>

      <p className="mt-3 font-serif text-[17px] leading-relaxed text-ink-soft">
        <span className="text-muted">Son :</span> {letter.soundFr}.
      </p>

      {forms.length > 0 && (
        <p className="mt-2 text-sm text-muted">
          Formes :{" "}
          {forms.map(({ label, shape }, i) => (
            <span key={label}>
              {i > 0 && " · "}
              {label}{" "}
              <span lang={language} dir={dir} className="font-serif text-lg text-ink">
                {shape}
              </span>
            </span>
          ))}
        </p>
      )}

      {letter.kind === "false-friend" && letter.lookalike && (
        <p className="mt-2 border-y border-dashed border-line py-2 text-[13px] leading-relaxed text-ink">
          <strong>Faux ami</strong> : ressemble à «&nbsp;{letter.lookalike}&nbsp;» mais se lit «&nbsp;{letter.latin}&nbsp;».
        </p>
      )}
      {letter.kind === "sign" && (
        <p className="mt-2 border-y border-dashed border-line py-2 text-[13px] leading-relaxed text-ink-soft">
          Signe sans son propre : il modifie la lecture des lettres voisines.
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <p className="min-w-0">
          <span lang={language} dir={dir} className="font-serif text-xl font-semibold">
            {letter.example.word}
          </span>{" "}
          <span className="text-sm text-muted">{letter.example.translation}</span>
        </p>
        <ListenButton text={stripStress(letter.example.word)} language={language} />
      </div>
    </article>
  );
}
