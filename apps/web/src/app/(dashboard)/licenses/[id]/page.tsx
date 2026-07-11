'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { Field, FormError, SubmitButton } from '@/features/auth/auth-form';
import {
  activateLicense,
  assignLicenseSeat,
  deactivateLicense,
  getLicenseEntitlements,
  listLicenseActivations,
  listLicenseSeats,
} from '@/lib/api-client/licensing';
import type {
  LicenseActivationRecord,
  LicenseEntitlements,
  LicenseSeatRecord,
} from '@mixoraone/contracts';
import { ApiClientError } from '@/lib/api-client/http';

export default function LicenseDetailPage() {
  const params = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [entitlements, setEntitlements] = useState<LicenseEntitlements | null>(null);
  const [seats, setSeats] = useState<LicenseSeatRecord[]>([]);
  const [activations, setActivations] = useState<LicenseActivationRecord[]>([]);
  const [email, setEmail] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reload = useCallback(() => {
    if (!accessToken) {
      return;
    }
    getLicenseEntitlements(accessToken, params.id)
      .then(setEntitlements)
      .catch(() => setEntitlements(null));
    listLicenseSeats(accessToken, params.id)
      .then(setSeats)
      .catch(() => setSeats([]));
    listLicenseActivations(accessToken, params.id)
      .then(setActivations)
      .catch(() => setActivations([]));
  }, [accessToken, params.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!accessToken) {
    return null;
  }
  if (!entitlements) {
    return <div className="mx-auto max-w-3xl px-6 py-12 text-slate-400">Loading license…</div>;
  }

  async function onAssignSeat(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await assignLicenseSeat(accessToken!, params.id, { email: email.trim() });
      setEmail('');
      reload();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Could not assign seat');
    } finally {
      setPending(false);
    }
  }

  async function onActivate(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const deviceId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `device-${Date.now()}`;
      await activateLicense(accessToken!, params.id, {
        deviceId,
        deviceName: deviceName.trim() || undefined,
      });
      setDeviceName('');
      reload();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Activation failed');
    } finally {
      setPending(false);
    }
  }

  async function onDeactivate(activationId: string) {
    setPending(true);
    setError(null);
    try {
      await deactivateLicense(accessToken!, params.id, { activationId });
      reload();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Could not deactivate');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/licenses" className="text-sm text-brand-500 hover:underline">
        ← All licenses
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{entitlements.productName}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {entitlements.valid ? 'Valid entitlement' : 'Not currently valid'} ·{' '}
        {entitlements.seatsAssigned}/{entitlements.seatLimit} seats ·{' '}
        {entitlements.activeActivations} active devices
      </p>

      <section className="mt-8 rounded-xl bg-surface-muted p-6">
        <h2 className="text-lg font-semibold">Entitlements</h2>
        <ul className="mt-3 space-y-1 text-sm text-slate-300">
          {entitlements.features.map((feature) => (
            <li key={feature}>• {feature}</li>
          ))}
        </ul>
      </section>

      {seats.length > 0 && (
        <section className="mt-6 rounded-xl bg-surface-muted p-6">
          <h2 className="text-lg font-semibold">Seats</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {seats.map((seat) => (
              <li key={seat.id} className="rounded-lg bg-surface px-4 py-3">
                {seat.assignedEmail ?? seat.assignedUserId ?? 'Unassigned'}
                <span className="ml-3 text-slate-400">
                  {seat.activeActivations} active device
                  {seat.activeActivations === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
          <form onSubmit={onAssignSeat} className="mt-4 space-y-3">
            <Field
              label="Assign seat by email"
              type="email"
              value={email}
              onChange={setEmail}
            />
            <SubmitButton label="Assign seat" pending={pending} />
          </form>
        </section>
      )}

      <section className="mt-6 rounded-xl bg-surface-muted p-6">
        <h2 className="text-lg font-semibold">Device activations</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {activations.map((activation) => (
            <li
              key={activation.id}
              className="flex items-center justify-between rounded-lg bg-surface px-4 py-3"
            >
              <div>
                <p className="font-semibold">{activation.deviceName ?? activation.deviceId}</p>
                <p className="text-slate-400">
                  {activation.revokedAt ? 'Revoked' : 'Active'} · last seen{' '}
                  {new Date(activation.lastSeenAt).toLocaleString()}
                </p>
              </div>
              {!activation.revokedAt && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void onDeactivate(activation.id)}
                  className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs text-red-400 hover:border-red-400 disabled:opacity-60"
                >
                  Deactivate
                </button>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={onActivate} className="mt-4 space-y-3">
          <Field
            label="Device name (optional)"
            type="text"
            value={deviceName}
            onChange={setDeviceName}
          />
          <SubmitButton label="Activate this browser/device" pending={pending} />
        </form>
      </section>

      <FormError message={error} />
    </div>
  );
}
