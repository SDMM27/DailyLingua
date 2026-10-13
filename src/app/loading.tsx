export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Chargement">
      <div className="space-y-3">
        <div className="h-3 w-32 rounded-full bg-surface-sunk" />
        <div className="h-9 w-3/4 rounded-xl bg-surface-sunk" />
      </div>
      <div className="h-72 rounded-3xl bg-surface-sunk" />
      <div className="h-36 rounded-3xl bg-surface-sunk" />
    </div>
  );
}
