'use client';

import { FormEvent, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { FormError, SubmitButton } from '@/features/auth/auth-form';
import { ApiClientError } from '@/lib/api-client/http';
import { submitFeedback } from '@/lib/api-client/reviews';

export default function FeedbackPage() {
  const { accessToken } = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [productId, setProductId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!accessToken) {
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSubmitted(false);
    try {
      await submitFeedback(accessToken!, {
        subject,
        body,
        productId: productId.trim() || undefined,
      });
      setSubject('');
      setBody('');
      setProductId('');
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Could not submit feedback');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Send feedback</h1>
      <p className="mt-2 text-slate-300">
        Share suggestions, report issues, or tell us how we can improve MixoraOne.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-xl bg-surface-muted p-6">
        <FormError message={error} />
        {submitted && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            Thank you — your feedback has been received.
          </p>
        )}
        <label className="block">
          <span className="text-sm font-medium text-slate-300">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-300">Message</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            rows={6}
            className="mt-1 w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-300">Product ID (optional)</span>
          <input
            type="text"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            placeholder="Link feedback to a specific product"
            className="mt-1 w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500"
          />
        </label>
        <SubmitButton label="Submit feedback" pending={pending} />
      </form>
    </div>
  );
}
