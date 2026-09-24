import type { Metadata } from 'next';
import { Bricolage_Grotesque, Figtree } from 'next/font/google';
import Link from 'next/link';
import { logout } from './actions';
import { API_URL, currentUser } from '@/lib/api';
import './globals.css';

const display = Bricolage_Grotesque({ variable: '--font-display', subsets: ['latin'], weight: ['600', '700'] });
const body = Figtree({ variable: '--font-body', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Gather — find events worth showing up for', template: '%s · Gather' },
  description: 'Host events, RSVP in one tap, and see who else is going.',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const user = await currentUser();

  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans text-[16px]">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-3" aria-label="Main">
            <Link href="/" className="mr-auto font-display text-xl font-bold tracking-tight">
              Gather<span className="text-accent">.</span>
            </Link>
            {user ? (
              <>
                <Link href="/me" className="rounded-md px-3 py-2 text-sm font-semibold text-muted hover:text-ink">
                  My events
                </Link>
                <Link
                  href="/events/new"
                  className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-ink hover:opacity-90"
                >
                  Host an event
                </Link>
                <form action={logout}>
                  <button className="rounded-md px-3 py-2 text-sm font-semibold text-muted hover:text-ink" title={user.email}>
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-md px-3 py-2 text-sm font-semibold text-muted hover:text-ink">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-ink hover:opacity-90"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line px-4 py-6 text-center text-sm text-muted">
          Next.js on Vercel · NestJS + PostgreSQL on Render ·{' '}
          <a className="underline hover:text-ink" href={`${API_URL}/docs`}>
            API docs
          </a>
        </footer>
      </body>
    </html>
  );
}
