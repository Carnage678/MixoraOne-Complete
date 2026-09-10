'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { ShowcaseProject } from './mock-data';
import { useToast } from './toast';

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_MAP: Record<ShowcaseProject['status'], { label: string; className: string }> = {
  live: { label: 'Live', className: 'bg-emerald-500/10 text-emerald-400' },
  draft: { label: 'Draft', className: 'bg-amber-500/10 text-amber-400' },
  archived: { label: 'Archived', className: 'bg-slate-500/10 text-slate-400' },
};

// ─── Dropdown menu ───────────────────────────────────────────────────────────

function MoreMenu({ onAction }: { onAction: (action: string) => void }) {
  const [open, setOpen] = useState(false);
  const items = ['Edit', 'View', 'Share', 'Delete'];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
        aria-label="More options"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-white/10 bg-surface-muted py-1 shadow-xl">
            {items.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onAction(item);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition hover:bg-white/5 ${
                  item === 'Delete' ? 'text-red-400' : 'text-slate-200'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Project card ────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: ShowcaseProject }) {
  const toast = useToast();
  const status = STATUS_MAP[project.status];

  function handleAction(action: string) {
    toast.show(`${action} "${project.name}" — coming soon.`);
  }

  return (
    <div className="group rounded-xl border border-white/[0.06] bg-surface-muted transition hover:border-white/[0.12]">
      {/* Thumbnail area */}
      <div
        className={`flex h-32 items-center justify-center rounded-t-xl bg-gradient-to-br ${project.thumbnailColor}`}
      >
        <span className="text-3xl font-bold text-white/20">{project.name.charAt(0)}</span>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold tracking-tight">{project.name}</h3>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-400">
              {project.description}
            </p>
          </div>
          <MoreMenu onAction={handleAction} />
        </div>

        {/* Tech stack */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.techStack.map((tech) => (
            <span
              key={tech}
              className="rounded bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-slate-400"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Meta row */}
        <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
          <span className={`rounded-full px-2 py-0.5 font-medium ${status.className}`}>
            {status.label}
          </span>
          <span>{project.views.toLocaleString()} views</span>
          {project.hasDemo && (
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Demo
            </span>
          )}
          {project.hasGithub && (
            <span className="flex items-center gap-1 text-slate-400">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              Repo
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Link
            href="/products"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/5"
          >
            View project
          </Link>
          {project.hasDemo && (
            <button
              type="button"
              onClick={() => toast.show('Live demo would open here.')}
              className="rounded-lg border border-brand-500/30 px-3 py-1.5 text-xs font-medium text-brand-500 transition hover:border-brand-500/50 hover:bg-brand-500/5"
            >
              Live demo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyProjects() {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-8 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
        <svg className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
      <h3 className="font-semibold text-slate-200">No projects yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
        Showcase your best work and let companies discover what you can build.
      </p>
      <Link
        href="/products"
        className="mt-5 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
      >
        Add your first project
      </Link>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ProjectShowcase({ projects }: { projects: ShowcaseProject[] }) {
  const toast = useToast();

  return (
    <section>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Your Projects</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Showcase the work you want people to discover.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.show('Project creation coming soon.')}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          + Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="mt-6">
          <EmptyProjects />
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}
