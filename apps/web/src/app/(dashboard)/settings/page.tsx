'use client';

import { FormEvent, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { Field, FormError, SubmitButton } from '@/features/auth/auth-form';
import { updateProfile } from '@/lib/api-client/organizations';
import { ApiClientError } from '@/lib/api-client/http';

export default function SettingsPage() {
  const { user, accessToken, applySessionUser } = useAuth();
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  if (!user || !accessToken) {
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateProfile(accessToken!, { name });
      applySessionUser(updated);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <p className="mt-2 text-slate-300">Manage your profile.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-xl bg-surface-muted p-6">
        <FormError message={error} />
        {saved && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            Profile updated.
          </p>
        )}
        <Field label="Name" type="text" value={name} onChange={setName} autoComplete="name" />
        <div>
          <span className="text-sm font-medium text-slate-300">Email</span>
          <p className="mt-1 rounded-lg border border-white/5 bg-surface px-3 py-2 text-sm text-slate-400">
            {user.email} {user.emailVerified ? '(verified)' : '(unverified)'}
          </p>
        </div>
        <SubmitButton label="Save changes" pending={pending} />
      </form>
    </div>
  );
}
