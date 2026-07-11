'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

import { useAuth } from '@/features/auth/auth-context';

/** Client-side gate for authenticated pages; the API enforces the real rules. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/sign-in');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading your workspace…
      </div>
    );
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
              <Link href="/dashboard" className="transition hover:text-white">
                Dashboard
              </Link>
              <Link href="/products" className="transition hover:text-white">
                Products
              </Link>
              <Link href="/saved" className="transition hover:text-white">
                Saved
              </Link>
              <Link href="/orders" className="transition hover:text-white">
                Orders
              </Link>
              <Link href="/billing" className="transition hover:text-white">
                Billing
              </Link>
              <Link href="/licenses" className="transition hover:text-white">
                Licenses
              </Link>
              <Link href="/assistant" className="transition hover:text-white">
                Assistant
              </Link>
              <Link href="/organizations" className="transition hover:text-white">
                Organizations
              </Link>
              <Link href="/developer" className="transition hover:text-white">
                Developer
              </Link>
              <Link href="/feedback" className="transition hover:text-white">
                Feedback
              </Link>
              <Link href="/analytics" className="transition hover:text-white">
                Analytics
              </Link>
              {user.role === 'ADMIN' && (
                <Link href="/admin/moderation" className="transition hover:text-white">
                  Admin
                </Link>
              )}
              <Link href="/settings" className="transition hover:text-white">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
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
