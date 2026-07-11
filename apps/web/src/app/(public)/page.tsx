import Link from 'next/link';

const PILLARS = [
  {
    title: 'Software Marketplace',
    description:
      'Discover, evaluate, and purchase production software with verified listings, versioning, and documentation.',
  },
  {
    title: 'AI Requirement Assistant',
    description:
      'Describe what your business needs in plain language and get matched with the right software and developers.',
  },
  {
    title: 'Trust and Licensing',
    description:
      'Verified developers, transparent reviews, and license management built into every purchase.',
  },
] as const;

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="py-24 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-brand-500">
          AI-powered software commerce
        </p>
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight">
          Where businesses find software and developers grow their products
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
          MixoraOne helps businesses discover, evaluate, purchase, and manage software while
          developers showcase, market, and monetize their work.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/marketplace"
            className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-500"
          >
            Browse the marketplace
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/40"
          >
            Sell your software
          </Link>
        </div>
      </section>

      <section className="grid gap-6 pb-24 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <div key={pillar.title} className="rounded-xl bg-surface-muted p-6">
            <h2 className="text-lg font-semibold">{pillar.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{pillar.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
