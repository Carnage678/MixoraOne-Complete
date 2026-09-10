'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_MAIN: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '◻' },
  { href: '/products', label: 'Projects', icon: '◈' },
  { href: '/developer', label: 'Profile', icon: '◉' },
  { href: '/analytics', label: 'Analytics', icon: '◇' },
];

const NAV_DISCOVER: NavItem[] = [
  { href: '/saved', label: 'Saved', icon: '♡' },
  { href: '/orders', label: 'Orders', icon: '▤' },
  { href: '/licenses', label: 'Licenses', icon: '⊞' },
];

const NAV_TOOLS: NavItem[] = [
  { href: '/assistant', label: 'AI Assistant', icon: '✦' },
  { href: '/organizations', label: 'Organizations', icon: '⊡' },
  { href: '/feedback', label: 'Feedback', icon: '◎' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
        active
          ? 'bg-brand-600/10 font-medium text-brand-500'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
      }`}
    >
      <span className="w-4 text-center text-xs">{item.icon}</span>
      {item.label}
    </Link>
  );
}

function NavSection({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <div>
      <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-600">
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/sign-in');
    }
  }, [loading, user, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading your workspace…
      </div>
    );
  }

  const sidebar = (
    <nav className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center px-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Mixora<span className="text-brand-500">One</span>
        </Link>
      </div>

      {/* Nav groups */}
      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <NavSection label="Main" items={NAV_MAIN} pathname={pathname} />
        <NavSection label="Marketplace" items={NAV_DISCOVER} pathname={pathname} />
        <NavSection label="Tools" items={NAV_TOOLS} pathname={pathname} />
        {user.role === 'ADMIN' && (
          <NavSection
            label="Admin"
            items={[{ href: '/admin/moderation', label: 'Moderation', icon: '⚑' }]}
            pathname={pathname}
          />
        )}
      </div>

      {/* User footer */}
      <div className="border-t border-white/[0.06] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-500">
            {user.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-200">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void signOut().then(() => router.push('/'));
            }}
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
            title="Sign out"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-shrink-0 border-r border-white/[0.06] bg-surface lg:block">
        {sidebar}
      </aside>

      {/* Mobile header + sheet */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4 lg:hidden">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Mixora<span className="text-brand-500">One</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="rounded-md p-2 text-slate-400 transition hover:bg-white/5"
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            )}
          </button>
        </header>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileNavOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-surface lg:hidden">
              {sidebar}
            </div>
          </>
        )}

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
