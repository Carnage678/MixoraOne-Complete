'use client';

import type { DeveloperProfile } from '@mixoraone/contracts';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { Field, FormError, SubmitButton } from '@/features/auth/auth-form';
import { refreshSession } from '@/lib/api-client/auth';
import {
  createDeveloperProfile,
  fetchOwnDeveloperProfile,
  submitVerification,
  updateDeveloperProfile,
} from '@/lib/api-client/developers';
import { ApiClientError } from '@/lib/api-client/http';

type LoadState = 'loading' | 'missing' | 'ready';

function VerificationPanel({
  profile,
  accessToken,
  onSubmitted,
}: {
  profile: DeveloperProfile;
  accessToken: string;
  onSubmitted: () => void;
}) {
  const [legalName, setLegalName] = useState('');
  const [country, setCountry] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (profile.verified) {
    return (
      <p className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
        This developer profile is verified.
      </p>
    );
  }
  if (profile.verificationStatus === 'PENDING') {
    return (
      <p className="rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
        Your verification request is under review.
      </p>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await submitVerification(accessToken, { legalName, country });
      onSubmitted();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {profile.verificationStatus === 'REJECTED' && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Your previous request was rejected
          {profile.verificationNote ? `: ${profile.verificationNote}` : '.'} You can submit again.
        </p>
      )}
      <FormError message={error} />
      <Field label="Legal name" type="text" value={legalName} onChange={setLegalName} />
      <Field label="Country" type="text" value={country} onChange={setCountry} />
      <SubmitButton label="Submit for verification" pending={pending} />
    </form>
  );
}

export default function DeveloperStudioPage() {
  const { accessToken } = useAuth();
  const [state, setState] = useState<LoadState>('loading');
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const reload = useCallback(() => {
    if (!accessToken) {
      return;
    }
    fetchOwnDeveloperProfile(accessToken)
      .then((data) => {
        setProfile(data);
        setDisplayName(data.displayName);
        setHeadline(data.headline ?? '');
        setBio(data.bio ?? '');
        setState('ready');
      })
      .catch(() => setState('missing'));
  }, [accessToken]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!accessToken) {
    return null;
  }
  if (state === 'loading') {
    return <div className="mx-auto max-w-2xl px-6 py-12 text-slate-400">Loading…</div>;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      if (state === 'missing') {
        await createDeveloperProfile(accessToken!, {
          displayName,
          headline: headline || undefined,
          bio: bio || undefined,
        });
        // Role changed to DEVELOPER; refresh the access token to carry it.
        await refreshSession().catch(() => undefined);
        reload();
      } else {
        const updated = await updateDeveloperProfile(accessToken!, {
          displayName,
          headline,
          bio,
        });
        setProfile(updated);
        setSaved(true);
      }
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Developer studio</h1>
      <p className="mt-2 text-slate-300">
        {state === 'missing'
          ? 'Create your public developer profile to start publishing software.'
          : 'Manage how buyers see you on MixoraOne.'}
      </p>

      {state === 'ready' && profile && (
        <p className="mt-4 text-sm text-slate-400">
          Public page:{' '}
          <Link href={`/developers/${profile.slug}`} className="text-brand-500 hover:underline">
            /developers/{profile.slug}
          </Link>
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-xl bg-surface-muted p-6">
        <FormError message={error} />
        {saved && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            Profile saved.
          </p>
        )}
        <Field label="Display name" type="text" value={displayName} onChange={setDisplayName} />
        <Field label="Headline" type="text" value={headline} onChange={setHeadline} />
        <label className="block">
          <span className="text-sm font-medium text-slate-300">About</span>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={5}
            className="mt-1 w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-brand-500"
          />
        </label>
        <SubmitButton
          label={state === 'missing' ? 'Create developer profile' : 'Save profile'}
          pending={pending}
        />
      </form>

      {state === 'ready' && profile && (
        <div className="mt-8 rounded-xl bg-surface-muted p-6">
          <h2 className="mb-4 text-lg font-semibold">Trust verification</h2>
          <VerificationPanel profile={profile} accessToken={accessToken} onSubmitted={reload} />
        </div>
      )}
    </div>
  );
}
