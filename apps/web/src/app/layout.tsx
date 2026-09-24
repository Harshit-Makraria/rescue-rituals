import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { readTheme } from '@/lib/theme';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ variable: '--font-jakarta', subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: { default: 'Gather — find events worth showing up for', template: '%s · Gather' },
  description: 'Host events, RSVP in one tap, and see who else is going.',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const theme = await readTheme();
  return (
    <html
      lang="en"
      data-theme={theme === 'system' ? undefined : theme}
      suppressHydrationWarning
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans text-[15px] text-ink">{children}</body>
    </html>
  );
}
