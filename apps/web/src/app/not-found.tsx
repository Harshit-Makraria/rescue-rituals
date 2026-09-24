import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
        <p className="text-5xl font-extrabold text-accent">404</p>
        <h1 className="mt-3 text-xl font-bold">We couldn’t find that page</h1>
        <p className="mt-2 text-muted">The event may have been cancelled, or the link is wrong.</p>
        <Link href="/" className="mt-5 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
          Discover events
        </Link>
      </div>
    </div>
  );
}
