import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { Eyebrow } from "@/components/ui/primitives";

/** A "brève" of the side column: rubric, headline and a line of detail, set between two rules. */
export function Brief({
  rubric,
  title,
  hint,
  ...props
}: { rubric: ReactNode; title: ReactNode; hint: ReactNode } & Omit<ComponentProps<typeof Link>, "children" | "className">) {
  return (
    <Link {...props} className="group flex items-start gap-3 py-4 transition-colors hover:bg-surface-sunk/60">
      <span className="min-w-0 flex-1">
        <Eyebrow>{rubric}</Eyebrow>
        <span className="mt-1 block font-serif text-lg leading-snug font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted">{hint}</span>
      </span>
      <ArrowRightIcon
        width={16}
        height={16}
        className="mt-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
