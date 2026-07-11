'use client';

import type { ReviewRecord } from '@mixoraone/contracts';
import { FormEvent, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { FormError, SubmitButton } from '@/features/auth/auth-form';
import { ApiClientError } from '@/lib/api-client/http';
import {
  createReport,
  createReview,
  listProductReviews,
} from '@/lib/api-client/reviews';

function StarRating({ value, onChange }: { value: number; onChange?: (rating: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          className={`text-lg transition ${star <= value ? 'text-amber-400' : 'text-slate-600'} ${onChange ? 'hover:text-amber-300' : ''}`}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  accessToken,
  onReported,
}: {
  review: ReviewRecord;
  accessToken: string | null;
  onReported: () => void;
}) {
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onReport(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setPending(true);
    setError(null);
    try {
      await createReport(accessToken, {
        targetType: 'REVIEW',
        targetId: review.id,
        reason: reportReason,
      });
      setReporting(false);
      setReportReason('');
      onReported();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Could not submit report');
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="rounded-xl bg-surface-muted p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <StarRating value={review.rating} />
            {review.verifiedPurchase && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                Verified purchase
              </span>
            )}
          </div>
          {review.title && <h3 className="mt-2 font-semibold">{review.title}</h3>}
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{review.body}</p>
        </div>
        {accessToken && (
          <button
            type="button"
            onClick={() => setReporting((value) => !value)}
            className="shrink-0 text-xs text-slate-500 transition hover:text-slate-300"
          >
            Report
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {review.userName} · {new Date(review.createdAt).toLocaleDateString()}
      </p>

      {review.replies.length > 0 && (
        <div className="mt-4 space-y-3 border-l-2 border-brand-500/30 pl-4">
          {review.replies.map((reply) => (
            <div key={reply.id}>
              <p className="text-xs font-semibold text-brand-500">{reply.developerDisplayName}</p>
              <p className="mt-1 text-sm text-slate-300">{reply.body}</p>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(reply.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {reporting && (
        <form onSubmit={onReport} className="mt-4 space-y-3 rounded-lg bg-surface p-4">
          <FormError message={error} />
          <label className="block">
            <span className="text-xs font-medium text-slate-400">Reason for report</span>
            <input
              type="text"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-surface-muted px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500"
            />
          </label>
          <SubmitButton label="Submit report" pending={pending} />
        </form>
      )}
    </article>
  );
}

export function ProductReviewsSection({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const { accessToken } = useAuth();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  const loadReviews = () => {
    setLoading(true);
    listProductReviews(productId)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setPending(true);
    setError(null);
    try {
      await createReview(accessToken, productId, {
        rating,
        title: title.trim() || undefined,
        body,
      });
      setShowForm(false);
      setTitle('');
      setBody('');
      setRating(5);
      loadReviews();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Could not submit review');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Customer reviews</h2>
          {!loading && reviews.length > 0 && averageRating !== null && (
            <p className="mt-1 text-sm text-slate-400">
              {averageRating.toFixed(1)} out of 5 · {reviews.length} review
              {reviews.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
        {accessToken ? (
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/30"
          >
            Write a review
          </button>
        ) : (
          <a
            href={`/sign-in?next=/marketplace/${productSlug}`}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/30"
          >
            Sign in to review
          </a>
        )}
      </div>

      {reported && (
        <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Report submitted. Our team will review it shortly.
        </p>
      )}

      {showForm && accessToken && (
        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl bg-surface-muted p-6">
          <FormError message={error} />
          <div>
            <span className="text-sm font-medium text-slate-300">Your rating</span>
            <div className="mt-2">
              <StarRating value={rating} onChange={setRating} />
            </div>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Title (optional)</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Review</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              rows={4}
              className="mt-1 w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500"
            />
          </label>
          <SubmitButton label="Submit review" pending={pending} />
        </form>
      )}

      <div className="mt-6 space-y-4">
        {loading && <p className="text-sm text-slate-400">Loading reviews…</p>}
        {!loading && reviews.length === 0 && (
          <p className="rounded-xl bg-surface-muted p-6 text-sm text-slate-400">
            No reviews yet. Be the first to share your experience.
          </p>
        )}
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            accessToken={accessToken}
            onReported={() => setReported(true)}
          />
        ))}
      </div>
    </section>
  );
}
