'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-6 text-center">
      <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted">The API may be waking up. Try again in a few seconds.</p>
      <button onClick={reset} className="mt-4 rounded-lg bg-accent px-4 py-2.5 font-semibold text-accent-ink">
        Try again
      </button>
    </div>
  );
}
