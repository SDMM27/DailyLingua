import Link from "next/link";
import { languageStyle } from "@/components/ui/language-style";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { diffInDays } from "@/lib/domain/dates";
import { relativeDueLabel } from "@/lib/domain/spaced-repetition";
import type { DateKey } from "@/lib/schemas/common";
import type { VocabularyItem } from "@/lib/schemas/vocabulary";

export function ReviewPreview({
  items,
  dueCount,
  today,
}: {
  items: VocabularyItem[];
  dueCount: number;
  today: DateKey;
}) {
  return (
    <section>
      <SectionTitle
        action={
          <Link href="/vocabulaire" className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline">
            Tout voir
          </Link>
        }
      >
        Prochaines révisions
      </SectionTitle>
      <Card className="p-0 sm:p-0">
        <p className="border-b border-line px-5 py-3 text-sm text-ink-soft sm:px-6">
          {dueCount > 0 ? (
            <>
              <strong className="font-semibold text-ink">{dueCount} mots</strong> à revoir aujourd’hui
            </>
          ) : (
            "Rien à réviser aujourd’hui."
          )}
        </p>
        <ul className="divide-y divide-line">
          {items.map((item) => {
            const due = diffInDays(item.review.dueOn, today) >= 0;
            return (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                <span
                  className={`size-2 shrink-0 rounded-full ${languageStyle(item.language).bg}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p lang={item.language} className="truncate font-serif text-[16px] font-medium">
                    {item.term}
                  </p>
                  <p className="truncate text-xs text-muted">{item.translation}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    due ? "bg-ink text-paper" : "bg-surface-sunk text-ink-soft"
                  }`}
                >
                  {relativeDueLabel(item.review.dueOn, today)}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
