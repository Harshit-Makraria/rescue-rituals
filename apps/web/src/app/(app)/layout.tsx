import Link from 'next/link';
import { Sidebar } from '@/components/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, Icon } from '@/components/ui';
import { API_URL, api, currentUser } from '@/lib/api';
import { readTheme } from '@/lib/theme';

/** App shell: sidebar + top bar (search, theme, notifications, profile). */
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const [user, theme] = await Promise.all([currentUser(), readTheme()]);
  let unread = 0;
  if (user) {
    const client = await api();
    const { data } = await client.GET('/api/v1/users/me/notifications', { params: { query: { unread: true } } });
    unread = data?.unreadCount ?? 0;
  }

  return (
    <div className="min-h-screen">
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3 sm:flex-nowrap sm:px-6">
            <div className="lg:hidden">
              <Sidebar user={user} unread={unread} swaggerUrl={`${API_URL}/docs`} />
            </div>
            <Link href="/" className="flex items-center gap-2 sm:hidden" aria-label="Gather home">
              <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-ink">
                <Icon name="ticket" size={16} />
              </span>
              <span className="font-extrabold tracking-tight">Gather</span>
            </Link>
            {/* On phones the search gets its own full-width row below the top bar. */}
            <form action="/" role="search" className="relative order-last w-full min-w-0 sm:order-none sm:w-auto sm:max-w-md sm:flex-1">
              <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <label htmlFor="global-search" className="sr-only">
                Search events
              </label>
              <input
                id="global-search"
                name="q"
                placeholder="Search events or places"
                className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-3 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </form>
            <div className="ml-auto flex items-center gap-1.5">
              <ThemeToggle initial={theme} />
              {user ? (
                <>
                  <Link
                    href="/notifications"
                    className="relative grid size-10 place-items-center rounded-xl text-muted hover:bg-surface hover:text-ink"
                    aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                  >
                    <Icon name="bell" />
                    {unread > 0 && <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-danger ring-2 ring-bg" />}
                  </Link>
                  <Link href="/me" className="ml-1 hidden items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 hover:bg-surface sm:flex">
                    <Avatar name={user.name} size={34} />
                    <span className="max-w-32 truncate text-sm font-semibold">{user.name.split(' ')[0]}</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:text-ink min-[400px]:block">
                    Log in
                  </Link>
                  <Link href="/register" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:opacity-90">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
        <div className="hidden lg:block">
          <Sidebar user={user} unread={unread} swaggerUrl={`${API_URL}/docs`} />
        </div>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
