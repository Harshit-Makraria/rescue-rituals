import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_COOKIE,
  isExpired,
  REFRESH_COOKIE,
  sessionCookies,
  USER_COOKIE,
  type AuthTokens,
} from './lib/session';

const API_URL = (process.env.API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const PROTECTED = /^\/(me|notifications|events\/new|events\/[^/]+\/edit)(\/|$)/;

/**
 * Runs before every page render and server action:
 *  1. Silently refreshes an expired access token using the refresh cookie.
 *  2. Redirects signed-out visitors away from private pages.
 */
export async function proxy(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  let signedIn = !isExpired(access);
  let refreshed: AuthTokens | null = null;
  let clearSession = false;

  if (!signedIn && refresh) {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
        cache: 'no-store',
      });
      if (res.ok) {
        refreshed = (await res.json()) as AuthTokens;
        signedIn = true;
      } else if (res.status === 401) {
        clearSession = true;
      }
    } catch {
      // API unreachable (e.g. cold start) — carry on signed out for this request.
    }
  }

  if (!signedIn && PROTECTED.test(request.nextUrl.pathname)) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    const res = NextResponse.redirect(login);
    if (clearSession) [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE].forEach((c) => res.cookies.delete(c));
    return res;
  }

  if (refreshed) {
    const fresh = sessionCookies(refreshed);
    // Forward the new tokens to this render, and send them to the browser.
    fresh.forEach((c) => request.cookies.set(c.name, c.value));
    const res = NextResponse.next({ request: { headers: request.headers } });
    fresh.forEach((c) => res.cookies.set(c));
    return res;
  }

  if (clearSession) {
    [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE].forEach((c) => request.cookies.delete(c));
    const res = NextResponse.next({ request: { headers: request.headers } });
    [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE].forEach((c) => res.cookies.delete(c));
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico|webp)$).*)'],
};
