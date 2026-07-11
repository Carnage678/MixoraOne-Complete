'use client';

import type { QuestionRecord } from '@mixoraone/contracts';
import { FormEvent, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { FormError, SubmitButton } from '@/features/auth/auth-form';
import { ApiClientError } from '@/lib/api-client/http';
import {
  createAnswer,
  createQuestion,
  createReport,
  listProductQuestions,
} from '@/lib/api-client/reviews';

function QuestionCard({
  question,
  accessToken,
  onUpdated,
  onReported,
}: {
  question: QuestionRecord;
  accessToken: string | null;
  onUpdated: () => void;
  onReported: () => void;
}) {
  const [answerBody, setAnswerBody] = useState('');
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAnswer(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setPending(true);
    setError(null);
    try {
      await createAnswer(accessToken, question.id, { body: answerBody });
      setAnswerBody('');
      setShowAnswerForm(false);
      onUpdated();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Could not post answer');
    } finally {
      setPending(false);
    }
  }

  async function onReport() {
    if (!accessToken) return;
    const reason = window.prompt('Why are you reporting this question?');
    if (!reason?.trim()) return;
    try {
      await createReport(accessToken, {
        targetType: 'QUESTION',
        targetId: question.id,
        reason: reason.trim(),
      });
      onReported();
    } catch {
      // Silent fail for report prompt flow
    }
  }

  return (
    <article className="rounded-xl bg-surface-muted p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{question.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{question.body}</p>
        </div>
        {accessToken && (
          <button
            type="button"
            onClick={() => void onReport()}
            className="shrink-0 text-xs text-slate-500 transition hover:text-slate-300"
          >
            Report
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {question.userName} · {new Date(question.createdAt).toLocaleDateString()}
      </p>

      {question.answers.length > 0 && (
        <div className="mt-4 space-y-3 border-l-2 border-brand-500/30 pl-4">
          {question.answers.map((answer) => (
            <div key={answer.id}>
              <p className="text-xs font-semibold text-slate-200">{answer.userName}</p>
              <p className="mt-1 text-sm text-slate-300">{answer.body}</p>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(answer.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {accessToken && (
        <div className="mt-4">
          {!showAnswerForm ? (
            <button
              type="button"
              onClick={() => setShowAnswerForm(true)}
              className="text-xs font-medium text-brand-500 hover:underline"
            >
              Answer this question
            </button>
          ) : (
            <form onSubmit={onAnswer} className="space-y-3 rounded-lg bg-surface p-4">
              <FormError message={error} />
              <label className="block">
                <span className="text-xs font-medium text-slate-400">Your answer</span>
                <textarea
                  value={answerBody}
                  onChange={(event) => setAnswerBody(event.target.value)}
                  required
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-surface-muted px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500"
                />
              </label>
              <div className="flex gap-2">
                <SubmitButton label="Post answer" pending={pending} />
                <button
                  type="button"
                  onClick={() => setShowAnswerForm(false)}
                  className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-slate-300 hover:border-white/30"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

export function ProductQnaSection({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const { accessToken } = useAuth();
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  const loadQuestions = () => {
    setLoading(true);
    listProductQuestions(productId)
      .then(setQuestions)
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQuestions();
  }, [productId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setPending(true);
    setError(null);
    try {
      await createQuestion(accessToken, productId, { title, body });
      setShowForm(false);
      setTitle('');
      setBody('');
      loadQuestions();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Could not submit question');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Questions &amp; answers</h2>
        {accessToken ? (
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/30"
          >
            Ask a question
          </button>
        ) : (
          <a
            href={`/sign-in?next=/marketplace/${productSlug}`}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/30"
          >
            Sign in to ask
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
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Question title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Details</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              rows={4}
              className="mt-1 w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500"
            />
          </label>
          <SubmitButton label="Submit question" pending={pending} />
        </form>
      )}

      <div className="mt-6 space-y-4">
        {loading && <p className="text-sm text-slate-400">Loading questions…</p>}
        {!loading && questions.length === 0 && (
          <p className="rounded-xl bg-surface-muted p-6 text-sm text-slate-400">
            No questions yet. Ask the developer anything about this product.
          </p>
        )}
        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            accessToken={accessToken}
            onUpdated={loadQuestions}
            onReported={() => setReported(true)}
          />
        ))}
      </div>
    </section>
  );
}
