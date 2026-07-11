'use client';

import type { Organization, OrganizationMember } from '@mixoraone/contracts';
import { FormEvent, useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { Field, FormError, SubmitButton } from '@/features/auth/auth-form';
import { ApiClientError } from '@/lib/api-client/http';
import {
  addMember,
  createOrganization,
  listMembers,
  listOrganizations,
  removeMember,
} from '@/lib/api-client/organizations';

function MembersPanel({ organization }: { organization: Organization }) {
  const { user, accessToken } = useAuth();
  const [members, setMembers] = useState<OrganizationMember[] | null>(null);
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!accessToken) {
      return;
    }
    listMembers(accessToken, organization.id)
      .then(setMembers)
      .catch(() => setMembers(null));
  }, [accessToken, organization.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!accessToken || !user) {
    return null;
  }

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await addMember(accessToken!, organization.id, { email });
      setEmail('');
      reload();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  async function onRemove(member: OrganizationMember) {
    setError(null);
    try {
      await removeMember(accessToken!, organization.id, member.userId);
      reload();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
    }
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <FormError message={error} />
      {members === null ? (
        <p className="text-sm text-slate-400">Loading members…</p>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between text-sm">
              <span>
                <span className="text-slate-100">{member.name}</span>{' '}
                <span className="text-slate-400">({member.email})</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs uppercase tracking-wide text-slate-300">
                  {member.role.toLowerCase()}
                </span>
                {(organization.myRole === 'OWNER' || member.userId === user.id) && (
                  <button
                    type="button"
                    onClick={() => void onRemove(member)}
                    className="text-xs text-red-400 transition hover:text-red-300"
                  >
                    {member.userId === user.id ? 'Leave' : 'Remove'}
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {organization.myRole === 'OWNER' && (
        <form onSubmit={onAdd} className="mt-4 flex items-end gap-3">
          <div className="flex-1">
            <Field label="Add member by email" type="email" value={email} onChange={setEmail} />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
          >
            Add
          </button>
        </form>
      )}
    </div>
  );
}

export default function OrganizationsPage() {
  const { accessToken } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!accessToken) {
      return;
    }
    listOrganizations(accessToken)
      .then(setOrganizations)
      .catch(() => setOrganizations([]));
  }, [accessToken]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!accessToken) {
    return null;
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createOrganization(accessToken!, { name });
      setName('');
      reload();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
      <p className="mt-2 text-slate-300">
        Group your team to manage software purchases and licenses together.
      </p>

      <form onSubmit={onCreate} className="mt-8 space-y-4 rounded-xl bg-surface-muted p-6">
        <FormError message={error} />
        <Field label="Organization name" type="text" value={name} onChange={setName} />
        <SubmitButton label="Create organization" pending={pending} />
      </form>

      <div className="mt-10 space-y-4">
        {organizations === null && <p className="text-sm text-slate-400">Loading…</p>}
        {organizations?.length === 0 && (
          <p className="text-sm text-slate-400">You are not part of any organization yet.</p>
        )}
        {organizations?.map((organization) => (
          <div key={organization.id} className="rounded-xl bg-surface-muted p-6">
            <button
              type="button"
              onClick={() => setExpanded(expanded === organization.id ? null : organization.id)}
              className="flex w-full items-center justify-between text-left"
            >
              <span>
                <span className="text-lg font-semibold">{organization.name}</span>
                <span className="ml-3 text-sm text-slate-400">/{organization.slug}</span>
              </span>
              <span className="text-sm text-slate-300">
                {organization.memberCount} {organization.memberCount === 1 ? 'member' : 'members'} ·{' '}
                {organization.myRole.toLowerCase()}
              </span>
            </button>
            {expanded === organization.id && <MembersPanel organization={organization} />}
          </div>
        ))}
      </div>
    </div>
  );
}
