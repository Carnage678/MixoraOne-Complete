'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { verifyEmail } from '@/lib/api-client/auth';

type Status = 'verifying' | 'success' | 'failed';

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    if (!token) {
      setStatus('failed');
      return;
    }
    void verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('failed'));
  }, [token]);

  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-surface-muted p-8 text-center">
      {status === 'verifying' && <p className="text-slate-300">Verifying your email…</p>}
      {status === 'success' && (
        <>
          <h1 className="text-2xl font-bold">Email verified</h1>
          <p className="mt-3 text-sm text-slate-300">Your email address is confirmed.</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
          >
            Go to dashboard
          </Link>
        </>
      )}
      {status === 'failed' && (
        <>
          <h1 className="text-2xl font-bold">Verification failed</h1>
          <p className="mt-3 text-sm text-slate-300">
            This link is invalid or has expired. Sign in and request a new one.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-block rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30"
          >
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
