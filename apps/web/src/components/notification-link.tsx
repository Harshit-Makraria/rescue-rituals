'use client';

import Link from 'next/link';
import { markNotificationRead } from '@/app/actions';

/** Opens the related event and marks the notification read in the background. */
export function NotificationLink({
  id,
  unread,
  href,
  children,
}: {
  id: string;
  unread: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        if (unread) void markNotificationRead(id);
      }}
      className={`flex items-center gap-4 px-5 py-4 hover:bg-raised ${unread ? 'bg-accent-soft/40' : ''}`}
    >
      {children}
    </Link>
  );
}
