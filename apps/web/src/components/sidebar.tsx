'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logout } from '@/app/actions';
import type { SessionUser } from '@/lib/session';
import { Avatar, Icon } from './ui';

type Item = { href: string; label: string; icon: Parameters<typeof Icon>[0]['name']; badge?: number; external?: boolean };

function NavGroup({ title, items, pathname }: { title: string; items: Item[]; pathname: string }) {
  return (
    <div>
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{title}</p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = !item.external && (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                {...(item.external && { target: '_blank', rel: 'noreferrer' })}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-accent-soft font-semibold text-accent' : 'text-muted hover:bg-raised hover:text-ink'
                }`}
              >
                {active && <span className="absolute -left-4 top-2 bottom-2 w-1 rounded-r-full bg-accent" aria-hidden />}
                <Icon name={item.icon} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-accent-ink">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
                {item.external && <Icon name="external" size={14} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * App sidebar (Lunkgem / Spectra style). On large screens it's a fixed column;
 * below that it becomes a slide-in drawer opened from the top bar.
 */
export function Sidebar({ user, unread, swaggerUrl }: { user: SessionUser | null; unread: number; swaggerUrl: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const menu: Item[] = [
    { href: '/', label: 'Discover', icon: 'compass' },
    { href: '/events/new', label: 'Create event', icon: 'plus' },
    ...(user
      ? ([
          { href: '/me', label: 'My events', icon: 'calendar' },
          { href: '/notifications', label: 'Notifications', icon: 'bell', badge: unread },
        ] as Item[])
      : []),
  ];
  const resources: Item[] = [
    { href: '/docs', label: 'Documentation', icon: 'book' },
    { href: swaggerUrl, label: 'API (Swagger)', icon: 'code', external: true },
  ];

  const panel = (
    <div className="flex h-full flex-col gap-7 px-4 py-6">
      <Link href="/" className="flex items-center gap-2.5 px-3">
        <span className="grid size-8 place-items-center rounded-xl bg-accent text-accent-ink">
          <Icon name="ticket" size={18} />
        </span>
        <span className="text-lg font-extrabold tracking-tight">Gather</span>
      </Link>

      <nav aria-label="Main" className="flex-1 overflow-y-auto">
        <NavGroup title="Menu" items={menu} pathname={pathname} />
      </nav>

      <nav aria-label="Resources">
        <NavGroup title="Resources" items={resources} pathname={pathname} />
      </nav>

      {user ? (
        <div className="rounded-2xl border border-line bg-raised p-3">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <form action={logout} className="mt-3">
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface py-2 text-sm font-semibold text-muted hover:text-danger">
              <Icon name="logout" size={16} /> Log out
            </button>
          </form>
        </div>
      ) : (
        <div className="rounded-2xl bg-accent p-4 text-accent-ink">
          <p className="font-bold">Host your own event</p>
          <p className="mt-1 text-sm opacity-85">Create an account to RSVP and host in seconds.</p>
          <Link
            href="/register"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/40 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Get started <Icon name="arrow" size={16} />
          </Link>
          <Link href="/login" className="mt-2 block text-center text-sm font-semibold opacity-90 hover:opacity-100">
            I already have an account
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface lg:block">{panel}</aside>

      <button
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-xl border border-line bg-surface lg:hidden"
        aria-label="Open menu"
      >
        <Icon name="menu" />
      </button>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-6 grid size-9 place-items-center rounded-lg text-muted hover:bg-raised"
              aria-label="Close menu"
            >
              <Icon name="x" />
            </button>
            {panel}
          </aside>
        </div>
      )}
    </>
  );
}
