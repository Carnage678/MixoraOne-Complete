'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { AuthCard, Field, FormError, OAuthButtons, SubmitButton } from '@/features/auth/auth-form';
import { oauthStartUrl, register } from '@/lib/api-client/auth';
import { ApiClientError } from '@/lib/api-client/http';

export default function SignUpPage() {
  const router = useRouter();
  const { applySession } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const session = await register({ name, email, password });
      applySession(session);
      router.push('/dashboard');
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
      setPending(false);
    }
  }

  return (
    <AuthCard title="Create your account">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Name" type="text" value={name} onChange={setName} autoComplete="name" />
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field
          label="Password (10+ characters)"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={10}
        />
        <SubmitButton label="Create account" pending={pending} />
      </form>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-500">
        <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
      </div>
      <OAuthButtons startUrl={oauthStartUrl} />
      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-medium text-brand-500 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
