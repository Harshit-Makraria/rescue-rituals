import 'server-only';
import { cookies } from 'next/headers';
import type { ThemeChoice } from '@/components/theme-toggle';

/** The viewer's theme choice from the cookie; "system" when unset. */
export async function readTheme(): Promise<ThemeChoice> {
  const stored = (await cookies()).get('theme')?.value;
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}
