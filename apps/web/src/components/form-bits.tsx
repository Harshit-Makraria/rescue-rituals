'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({ children, pendingText }: { children: React.ReactNode; pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60"
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'mt-1.5 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none';

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
      {error}
    </p>
  );
}
