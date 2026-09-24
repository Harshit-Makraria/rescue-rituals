import type { Metadata } from 'next';
import { Bricolage_Grotesque, Figtree } from 'next/font/google';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { logout } from './actions';
import { ThemeToggle, type ThemeChoice } from '@/components/theme-toggle';
import { API_URL, currentUser } from '@/lib/api';
import './globals.css';

const display = Bricolage_Grotesque({ variable: '--font-display', subsets: ['latin'], weight: ['600', '700'] });
const body = Figtree({ variable: '--font-body', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Gather — find events worth showing up for', template: '%s · Gather' },
  description: 'Host events, RSVP in one tap, and see who else is going.',
};

const navLink = 'rounded-md px-3 py-2 text-sm font-semibold text-muted hover:text-ink';
const navCta = 'rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-ink hover:opacity-90';

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [user, jar] = await Promise.all([currentUser(), cookies()]);
  const stored = jar.get('theme')?.value;
  const theme: ThemeChoice = stored === 'light' || stored === 'dark' ? stored : 'system';

  return (
    <html
      lang="en"
      data-theme={theme === 'system' ? undefined : theme}
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-[16px]">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-3" aria-label="Main">
            <Link href="/" className="mr-auto font-display text-xl font-bold tracking-tight">
              Gather<span className="text-accent">.</span>
            </Link>
            <Link href="/docs" className={navLink}>
              Docs
            </Link>
            {user ? (
              <>
                <Link href="/me" className={navLink}>
                  My events
                </Link>
                <Link href="/events/new" className={navCta}>
                  Host an event
                </Link>
                <form action={logout}>
                  <button className={navLink} title={user.email}>
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className={navLink}>
                  Log in
                </Link>
                <Link href="/register" className={navCta}>
                  Sign up
                </Link>
              </>
            )}
            <ThemeToggle initial={theme} />
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line px-4 py-6 text-center text-sm text-muted">
          Next.js on Vercel · NestJS on Render · PostgreSQL on Neon ·{' '}
          <Link className="underline hover:text-ink" href="/docs">
            Docs
          </Link>{' '}
          ·{' '}
          <a className="underline hover:text-ink" href={`${API_URL}/docs`}>
            Swagger
          </a>
        </footer>
      </body>
    </html>
  );
}
