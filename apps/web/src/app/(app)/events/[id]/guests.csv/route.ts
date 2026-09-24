import { cookies } from 'next/headers';
import { API_URL } from '@/lib/api';
import { ACCESS_COOKIE } from '@/lib/session';

/**
 * Host-only CSV download. The browser has no API token (it lives in an httpOnly
 * cookie), so this route forwards the request with the session and streams the
 * API's CSV back. The API enforces that the caller is the host.
 */
export async function GET(_req: Request, { params }: RouteContext<'/events/[id]/guests.csv'>) {
  const { id } = await params;
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return new Response('Please log in first.', { status: 401 });

  const res = await fetch(`${API_URL}/api/v1/events/${encodeURIComponent(id)}/guests.csv`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return new Response(res.status === 403 ? 'Only the host can export guests.' : 'Export failed.', { status: res.status });

  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': res.headers.get('content-disposition') ?? 'attachment; filename="guests.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
