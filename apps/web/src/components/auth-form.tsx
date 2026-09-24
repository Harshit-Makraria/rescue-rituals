'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login, register, type FormState } from '@/app/actions';
import { Field, FormError, inputClass, SubmitButton } from './form-bits';

export function AuthForm({ mode, next }: { mode: 'login' | 'register'; next: string }) {
  const [state, action] = useActionState<FormState, FormData>(mode === 'login' ? login : register, undefined);
  const isLogin = mode === 'login';

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <header className="text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
        <p className="mt-1 text-muted">{isLogin ? 'Log in to RSVP and host events.' : 'It takes ten seconds.'}</p>
      </header>

      <form action={action} className="space-y-4 rounded-xl border border-line bg-surface p-5">
        <input type="hidden" name="next" value={next} />
        <FormError error={state?.error} />
        {!isLogin && (
          <Field label="Name">
            <input id="name" name="name" required maxLength={80} autoComplete="name" defaultValue={state?.values?.name} className={inputClass} />
          </Field>
        )}
        <Field label="Email">
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state?.values?.email}
            className={inputClass}
          />
        </Field>
        <Field label="Password" hint={isLogin ? undefined : 'At least 8 characters.'}>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={isLogin ? undefined : 8}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            className={inputClass}
          />
        </Field>
        <SubmitButton pendingText={isLogin ? 'Logging in…' : 'Creating account…'}>
          {isLogin ? 'Log in' : 'Sign up'}
        </SubmitButton>
      </form>

      {isLogin && (
        <p className="rounded-lg bg-accent-soft px-4 py-3 text-sm">
          <strong>Reviewing?</strong> Use <code className="font-semibold">demo@events.dev</code> (hosts the demo events) or{' '}
          <code className="font-semibold">guest@events.dev</code>, password <code className="font-semibold">Password123!</code>
        </p>
      )}

      <p className="text-center text-sm text-muted">
        {isLogin ? 'New here? ' : 'Already have an account? '}
        <Link
          href={`/${isLogin ? 'register' : 'login'}${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-semibold text-accent underline"
        >
          {isLogin ? 'Create an account' : 'Log in'}
        </Link>
      </p>
    </div>
  );
}
