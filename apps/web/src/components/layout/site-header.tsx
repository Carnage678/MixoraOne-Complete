'use client';

import Link from 'next/link';

import { useAuth } from '@/features/auth/auth-context';

const NAV_LINKS = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/status', label: 'Status' },
] as const;

export function SiteHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Mixora<span className="text-brand-500">One</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-slate-300">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </Link>
          ))}
          {!loading &&
            (user ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white transition hover:bg-brand-500"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="transition hover:text-white">
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white transition hover:bg-brand-500"
                >
                  Get started
                </Link>
              </>
            ))}
        </nav>
      </div>
    </header>
  );
}
