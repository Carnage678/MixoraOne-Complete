'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { AuthCard, Field, FormError, OAuthButtons, SubmitButton } from '@/features/auth/auth-form';
import { login, oauthStartUrl } from '@/lib/api-client/auth';
import { ApiClientError } from '@/lib/api-client/http';

const OAUTH_ERRORS: Record<string, string> = {
  account_exists:
    'An account with this email already exists. Sign in with your password to link it.',
  oauth_failed: 'Social sign-in failed. Please try again.',
};

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { applySession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const oauthError = searchParams.get('error');
  const [error, setError] = useState<string | null>(
    oauthError ? (OAUTH_ERRORS[oauthError] ?? OAUTH_ERRORS.oauth_failed) : null,
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const session = await login({ email, password });
      applySession(session);
      router.push('/dashboard');
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
      setPending(false);
    }
  }

  return (
    <AuthCard title="Sign in">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <SubmitButton label="Sign in" pending={pending} />
      </form>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-500">
        <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
      </div>
      <OAuthButtons startUrl={oauthStartUrl} />
      <p className="mt-6 text-center text-sm text-slate-400">
        New to MixoraOne?{' '}
        <Link href="/sign-up" className="font-medium text-brand-500 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
