'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login, register, type FormState } from '@/app/actions';
import { FormError, SubmitButton } from './form-bits';

const input =
  'mt-1.5 block w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none';

export function AuthForm({ mode, next }: { mode: 'login' | 'register'; next: string }) {
  const [state, action] = useActionState<FormState, FormData>(mode === 'login' ? login : register, undefined);
  const isLogin = mode === 'login';
  const otherHref = `/${isLogin ? 'register' : 'login'}${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="flex h-full flex-col justify-center">
      <h1 className="text-2xl font-extrabold tracking-tight">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
      <p className="mt-1 text-sm text-muted">{isLogin ? 'Sign in to RSVP and host events.' : 'It takes ten seconds.'}</p>

      <form action={action} className="mt-7 space-y-4">
        <input type="hidden" name="next" value={next} />
        <FormError error={state?.error} />
        {!isLogin && (
          <label className="block text-sm font-semibold">
            Name
            <input id="name" name="name" required maxLength={80} autoComplete="name" defaultValue={state?.values?.name} placeholder="Asha Rao" className={input} />
          </label>
        )}
        <label className="block text-sm font-semibold">
          Email
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state?.values?.email}
            placeholder="you@example.com"
            className={input}
          />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={isLogin ? undefined : 8}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            placeholder={isLogin ? '••••••••' : 'At least 8 characters'}
            className={input}
          />
        </label>
        <div className="pt-2">
          <SubmitButton pendingText={isLogin ? 'Signing in…' : 'Creating account…'}>
            {isLogin ? 'Sign in' : 'Create account'}
          </SubmitButton>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {isLogin ? 'New here? ' : 'Already have an account? '}
        <Link href={otherHref} className="font-semibold text-accent underline underline-offset-2">
          {isLogin ? 'Create an account' : 'Sign in'}
        </Link>
      </p>

      {isLogin && (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-raised px-4 py-3 text-xs leading-relaxed text-muted">
          <span className="font-semibold text-ink">Reviewing?</span> Use <code className="font-semibold text-ink">demo@events.dev</code>{' '}
          (hosts the demo events) or <code className="font-semibold text-ink">guest@events.dev</code>, password{' '}
          <code className="font-semibold text-ink">Password123!</code>
        </div>
      )}

      <Link href="/" className="mt-6 text-center text-sm font-semibold text-muted hover:text-ink">
        ← Back to events
      </Link>
    </div>
  );
}
