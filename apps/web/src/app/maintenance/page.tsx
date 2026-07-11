import Link from 'next/link';

export const metadata = {
  title: 'Maintenance',
};

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
        Scheduled maintenance
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">We&apos;ll be right back</h1>
      <p className="mt-3 max-w-md text-slate-300">
        MixoraOne is undergoing scheduled maintenance. Please check back shortly.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/status"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          Check platform status
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
