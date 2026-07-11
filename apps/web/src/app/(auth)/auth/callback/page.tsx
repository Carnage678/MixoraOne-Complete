'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { refreshSession } from '@/lib/api-client/auth';

/**
 * Landing page after an OAuth redirect: the API has already set the refresh
 * cookie, so we exchange it for an access token and continue.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const { applySession } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    void refreshSession()
      .then((session) => {
        applySession(session);
        router.replace('/dashboard');
      })
      .catch(() => {
        router.replace('/sign-in?error=oauth_failed');
      });
  }, [applySession, router]);

  return (
    <div className="text-center text-slate-300">
      <p className="text-lg font-medium">Completing sign-in…</p>
    </div>
  );
}
