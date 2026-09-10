'use client';

import Link from 'next/link';

import { useToast } from './toast';

interface QuickAction {
  label: string;
  href?: string;
  toast?: string;
  icon: string;
}

const ACTIONS: QuickAction[] = [
  { label: 'Add project', href: '/products', icon: '＋' },
  { label: 'Edit profile', href: '/developer', icon: '✏️' },
  { label: 'Share project', toast: 'Share options coming soon.', icon: '🔗' },
  { label: 'View public profile', href: '/developers/abhishek-anand', icon: '👤' },
];

export function QuickActions() {
  const toast = useToast();

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quick actions</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {ACTIONS.map((action) =>
          action.href ? (
            <Link
              key={action.label}
              href={action.href}
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-3.5 py-2 text-sm text-slate-300 transition hover:border-white/[0.16] hover:bg-white/5 hover:text-slate-100"
            >
              <span className="text-xs">{action.icon}</span>
              {action.label}
            </Link>
          ) : (
            <button
              key={action.label}
              type="button"
              onClick={() => action.toast && toast.show(action.toast)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-3.5 py-2 text-sm text-slate-300 transition hover:border-white/[0.16] hover:bg-white/5 hover:text-slate-100"
            >
              <span className="text-xs">{action.icon}</span>
              {action.label}
            </button>
          ),
        )}
      </div>
    </section>
  );
}
