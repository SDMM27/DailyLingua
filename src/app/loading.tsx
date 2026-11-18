/** Skeleton in the journal layout: kicker, headline, rule, then two columns split by a rule. */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Chargement">
      <div className="space-y-3 border-b border-ink pb-6">
        <div className="sd-shimmer h-3 w-32 rounded-full" />
        <div className="sd-shimmer h-10 w-3/4 rounded-lg" />
      </div>
      <div className="grid gap-8 md:grid-cols-2 md:gap-0">
        <div className="space-y-3 md:pr-10">
          <div className="sd-shimmer h-56 rounded-lg" />
          <div className="sd-shimmer h-4 w-2/3 rounded-full" />
        </div>
        <div className="space-y-3 md:border-l md:border-line md:pl-10">
          <div className="sd-shimmer h-8 w-1/2 rounded-lg" />
          <div className="sd-shimmer h-4 w-full rounded-full" />
          <div className="sd-shimmer h-4 w-5/6 rounded-full" />
          <div className="sd-shimmer h-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
