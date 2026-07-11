'use client';

import type { AiChatMessage, AiProductRecommendation } from '@mixoraone/contracts';
import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { FormError } from '@/features/auth/auth-form';
import { createAiSession, sendAiMessage } from '@/lib/api-client/ai';
import { ApiClientError } from '@/lib/api-client/http';

function MessageBubble({ message }: { message: AiChatMessage }) {
  const isUser = message.role === 'USER';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser ? 'bg-brand-600 text-white' : 'bg-surface-muted text-slate-100'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: AiProductRecommendation }) {
  return (
    <Link
      href={`/marketplace/${recommendation.productSlug}`}
      className="block rounded-xl border border-brand-500/30 bg-brand-500/5 p-4 transition hover:border-brand-500/60"
    >
      <p className="font-semibold text-brand-500">{recommendation.productName}</p>
      <p className="mt-1 text-sm text-slate-300">{recommendation.reason}</p>
    </Link>
  );
}

export default function AssistantPage() {
  const { accessToken } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [recommendations, setRecommendations] = useState<AiProductRecommendation[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accessToken || sessionId) {
      return;
    }
    createAiSession(accessToken)
      .then((session) => setSessionId(session.id))
      .catch((cause) => {
        if (cause instanceof ApiClientError && cause.code === 'SERVICE_UNAVAILABLE') {
          setUnavailable(true);
        } else {
          setError('Could not start the assistant. Try again later.');
        }
      });
  }, [accessToken, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!accessToken) {
    return null;
  }

  if (unavailable) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">AI Requirement Assistant</h1>
        <div className="mt-8 rounded-xl bg-amber-500/10 p-6 text-sm text-amber-300">
          The AI assistant is not configured on this environment yet. Set <code>AI_PROVIDER</code>{' '}
          and the matching API key in the API environment to enable it.
        </div>
      </div>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!sessionId || !input.trim() || pending) {
      return;
    }
    const content = input.trim();
    setInput('');
    setError(null);
    setPending(true);
    setMessages((previous) => [
      ...previous,
      {
        id: `local-${Date.now()}`,
        role: 'USER',
        content,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const result = await sendAiMessage(accessToken!, sessionId, content);
      setMessages((previous) => [...previous, result.message]);
      if (result.recommendations.length > 0) {
        setRecommendations(result.recommendations);
      }
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">AI Requirement Assistant</h1>
      <p className="mt-1 text-sm text-slate-400">
        Describe what your business needs and get matched with software from the marketplace.
      </p>

      <div className="mt-6 flex-1 space-y-4 overflow-y-auto rounded-xl bg-surface p-1">
        {messages.length === 0 && (
          <div className="rounded-xl bg-surface-muted p-6 text-sm text-slate-300">
            Try: &quot;We are a 12-person retail company and need software to track inventory and
            automate purchase orders.&quot;
          </div>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {pending && <p className="px-2 text-sm text-slate-400">Assistant is thinking…</p>}
        <div ref={bottomRef} />
      </div>

      {recommendations.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-slate-300">Recommended for you</p>
          {recommendations.map((recommendation) => (
            <RecommendationCard key={recommendation.productSlug} recommendation={recommendation} />
          ))}
        </div>
      )}

      <div className="mt-4">
        <FormError message={error} />
        <form onSubmit={onSubmit} className="mt-2 flex gap-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={2000}
            placeholder="Describe your software needs…"
            className="flex-1 rounded-lg border border-white/10 bg-surface-muted px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={pending || !sessionId}
            className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
