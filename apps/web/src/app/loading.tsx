export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-2/3 animate-pulse rounded-lg bg-line" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-line bg-surface" />
        ))}
      </div>
      <p className="text-sm text-muted">Loading… (the free API server may take ~30s to wake up)</p>
    </div>
  );
}
