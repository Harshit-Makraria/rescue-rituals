// Cookie names and helpers shared by server actions and the proxy.
// Tokens live in httpOnly cookies: browser JavaScript never sees them, so an XSS
// bug can't steal a session. Only the Next.js server talks to the API.

export const ACCESS_COOKIE = 'ev_at';
export const REFRESH_COOKIE = 'ev_rt';
export const USER_COOKIE = 'ev_user';

export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

export type SessionUser = { id: string; name: string; email: string };

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SessionUser;
};

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

/** Session cookies for a fresh token pair, in the shape both `cookies()` and `NextResponse.cookies` accept. */
export function sessionCookies(tokens: AuthTokens) {
  return [
    { name: ACCESS_COOKIE, value: tokens.accessToken, ...cookieOptions(tokens.expiresIn) },
    { name: REFRESH_COOKIE, value: tokens.refreshToken, ...cookieOptions(REFRESH_MAX_AGE) },
    { name: USER_COOKIE, value: JSON.stringify(tokens.user), ...cookieOptions(REFRESH_MAX_AGE) },
  ];
}

/** True if the JWT is missing, malformed, or expires within the next 30 seconds. */
export function isExpired(token: string | undefined): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now() + 30_000;
  } catch {
    return true;
  }
}

export function parseUser(raw: string | undefined): SessionUser | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}
