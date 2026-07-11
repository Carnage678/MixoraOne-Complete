'use client';

import { useAuth } from '@/features/auth/auth-context';

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.name}</h1>
      <p className="mt-2 text-slate-300">
        Signed in as {user.email} ({user.role.toLowerCase()})
      </p>

      {!user.emailVerified && (
        <div className="mt-6 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Your email is not verified yet. Check your inbox for the verification link.
        </div>
      )}

      <div className="mt-10 rounded-xl bg-surface-muted p-6">
        <h2 className="text-lg font-semibold">Your marketplace home</h2>
        <p className="mt-2 text-sm text-slate-300">
          Product listings, purchases, and licenses will appear here as the next modules ship.
        </p>
      </div>
    </div>
  );
}
