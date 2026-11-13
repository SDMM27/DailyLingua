import type { HTMLAttributes } from "react";

const COLUMNS = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
} as const;

/** Item of a `RuledList`: a rule under it on phones, a rule on its left in every column on wide screens. */
export const ruledItem = "border-b border-line py-5 md:border-l md:px-6";

/**
 * A list laid out in newspaper columns separated by thin rules. The first column's rule sits in the
 * margin that the list pulls back and the wrapper clips, so the text keeps the page's left edge.
 */
export function RuledList({
  ordered = false,
  columns = 3,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & { ordered?: boolean; columns?: keyof typeof COLUMNS }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <div className="md:overflow-x-clip">
      <Tag className={`md:-ml-6 md:grid ${COLUMNS[columns]} ${className}`} {...props} />
    </div>
  );
}
