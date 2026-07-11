'use client';

import type { ReactNode } from 'react';

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-surface-muted p-8">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  label: string;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        className="mt-1 w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-brand-500"
      />
    </label>
  );
}

export function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
    >
      {pending ? 'Please wait…' : label}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400" role="alert">
      {message}
    </p>
  );
}

export function OAuthButtons({
  startUrl,
}: {
  startUrl: (provider: 'google' | 'github') => string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(['google', 'github'] as const).map((provider) => (
        <a
          key={provider}
          href={startUrl(provider)}
          className="rounded-lg border border-white/15 px-4 py-2.5 text-center text-sm font-medium capitalize text-slate-200 transition hover:border-white/30"
        >
          {provider}
        </a>
      ))}
    </div>
  );
}
