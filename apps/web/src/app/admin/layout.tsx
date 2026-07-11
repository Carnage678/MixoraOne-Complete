'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

import { useAuth } from '@/features/auth/auth-context';

/** Admin console shell; API enforces ADMIN role on every mutation. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/sign-in');
      return;
    }
    if (!loading && user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading admin console…
      </div>
    );
  }

  if (user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Mixora<span className="text-brand-500">One</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-slate-300">
              <Link href="/admin/moderation" className="transition hover:text-white">
                Moderation
              </Link>
              <Link href="/admin/reports" className="transition hover:text-white">
                Reports
              </Link>
              <Link href="/admin/trust" className="transition hover:text-white">
                Trust
              </Link>
              <Link href="/admin/analytics" className="transition hover:text-white">
                Analytics
              </Link>
              <Link href="/dashboard" className="transition hover:text-white">
                Dashboard
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-semibold text-brand-500">
              Admin
            </span>
            <span className="text-slate-300">{user.name}</span>
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => router.push('/'));
              }}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-200 transition hover:border-white/30"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
