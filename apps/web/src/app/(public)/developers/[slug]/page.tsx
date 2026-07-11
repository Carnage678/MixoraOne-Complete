import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { fetchPublicDeveloper } from '@/lib/api-client/developers';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const profile = await fetchPublicDeveloper(slug);
    return { title: `${profile.displayName} - Developer` };
  } catch {
    return { title: 'Developer' };
  }
}

export default async function PublicDeveloperPage({ params }: PageProps) {
  const { slug } = await params;
  let profile;
  try {
    profile = await fetchPublicDeveloper(slug);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{profile.displayName}</h1>
          {profile.headline && <p className="mt-2 text-lg text-slate-300">{profile.headline}</p>}
        </div>
        {profile.verified && (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-400">
            Verified
          </span>
        )}
      </div>

      <p className="mt-4 text-sm text-slate-500">
        On MixoraOne since {new Date(profile.memberSince).toLocaleDateString()}
      </p>

      {profile.bio && (
        <div className="mt-8 rounded-xl bg-surface-muted p-6">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">
            {profile.bio}
          </p>
        </div>
      )}

      {profile.skills.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Skills</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-white/5 px-3 py-1 text-sm text-slate-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {(profile.websiteUrl || profile.githubUrl) && (
        <div className="mt-6 flex gap-4 text-sm">
          {profile.websiteUrl && (
            <a
              href={profile.websiteUrl}
              rel="noopener noreferrer"
              target="_blank"
              className="text-brand-500 hover:underline"
            >
              Website
            </a>
          )}
          {profile.githubUrl && (
            <a
              href={profile.githubUrl}
              rel="noopener noreferrer"
              target="_blank"
              className="text-brand-500 hover:underline"
            >
              GitHub
            </a>
          )}
        </div>
      )}
    </div>
  );
}
