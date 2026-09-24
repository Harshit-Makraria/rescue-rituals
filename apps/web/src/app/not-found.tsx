import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-6 text-center">
      <h1 className="font-display text-2xl font-bold">Event not found</h1>
      <p className="mt-2 text-muted">It may have been cancelled, or the link is wrong.</p>
      <Link href="/" className="mt-4 inline-block font-semibold text-accent underline">
        Browse upcoming events
      </Link>
    </div>
  );
}
