'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-red-400">Error</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-3 max-w-md text-slate-300">
        An unexpected error occurred. You can try again or return to the homepage.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-slate-500">Reference: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
