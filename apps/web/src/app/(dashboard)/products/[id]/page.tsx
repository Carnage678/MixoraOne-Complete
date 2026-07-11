'use client';

import type {
  AiChatMessage,
  AiListingSuggestion,
  Product,
  ProductPricingPlan,
  ProductVersion,
} from '@mixoraone/contracts';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { Field, FormError, SubmitButton } from '@/features/auth/auth-form';
import {
  analyzeProductListing,
  createDeveloperAssistantSession,
  listProductSuggestions,
  resolveProductSuggestion,
  sendDeveloperAssistantMessage,
} from '@/lib/api-client/ai';
import { ApiClientError } from '@/lib/api-client/http';
import {
  addPricingPlan,
  addVersion,
  archiveProduct,
  getOwnProduct,
  listPricingPlans,
  listVersions,
  publishProduct,
  updateProduct,
} from '@/lib/api-client/products';

function useMessage(): [string | null, (value: string | null) => void] {
  const [message, setMessage] = useState<string | null>(null);
  return [message, setMessage];
}

function DetailsSection({
  product,
  accessToken,
  onChange,
}: {
  product: Product;
  accessToken: string;
  onChange: (product: Product) => void;
}) {
  const [name, setName] = useState(product.name);
  const [tagline, setTagline] = useState(product.tagline ?? '');
  const [description, setDescription] = useState(product.description ?? '');
  const [category, setCategory] = useState(product.category ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useMessage();
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateProduct(accessToken, product.id, {
        name,
        tagline,
        description,
        category,
      });
      onChange(updated);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-surface-muted p-6">
      <h2 className="text-lg font-semibold">Details</h2>
      <FormError message={error} />
      {saved && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">Saved.</p>
      )}
      <Field label="Name" type="text" value={name} onChange={setName} />
      <Field label="Tagline" type="text" value={tagline} onChange={setTagline} />
      <Field label="Category" type="text" value={category} onChange={setCategory} />
      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          Description (40+ characters to publish)
        </span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={6}
          className="mt-1 w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-brand-500"
        />
      </label>
      <SubmitButton label="Save details" pending={pending} />
    </form>
  );
}

function VersionsSection({ productId, accessToken }: { productId: string; accessToken: string }) {
  const [versions, setVersions] = useState<ProductVersion[]>([]);
  const [semver, setSemver] = useState('');
  const [changelog, setChangelog] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useMessage();

  const reload = useCallback(() => {
    listVersions(accessToken, productId)
      .then(setVersions)
      .catch(() => setVersions([]));
  }, [accessToken, productId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await addVersion(accessToken, productId, { semver, changelog: changelog || undefined });
      setSemver('');
      setChangelog('');
      reload();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl bg-surface-muted p-6">
      <h2 className="text-lg font-semibold">Versions</h2>
      {versions.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {versions.map((version) => (
            <li key={version.id} className="rounded-lg bg-surface px-4 py-3">
              <span className="font-semibold">v{version.semver}</span>
              <span className="ml-3 text-slate-400">
                {new Date(version.releasedAt).toLocaleDateString()}
              </span>
              {version.changelog && <p className="mt-1 text-slate-300">{version.changelog}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-400">No versions released yet.</p>
      )}
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <FormError message={error} />
        <Field label="Version (e.g. 1.0.0)" type="text" value={semver} onChange={setSemver} />
        <Field label="Changelog" type="text" value={changelog} onChange={setChangelog} />
        <SubmitButton label="Release version" pending={pending} />
      </form>
    </div>
  );
}

function PricingSection({ productId, accessToken }: { productId: string; accessToken: string }) {
  const [plans, setPlans] = useState<ProductPricingPlan[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useMessage();

  const reload = useCallback(() => {
    listPricingPlans(accessToken, productId)
      .then(setPlans)
      .catch(() => setPlans([]));
  }, [accessToken, productId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const priceCents = Math.round(Number(price) * 100);
      await addPricingPlan(accessToken, productId, {
        name,
        type: priceCents > 0 ? 'ONE_TIME' : 'FREE',
        priceCents,
      });
      setName('');
      setPrice('');
      reload();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl bg-surface-muted p-6">
      <h2 className="text-lg font-semibold">Pricing</h2>
      {plans.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="flex items-center justify-between rounded-lg bg-surface px-4 py-3"
            >
              <span className="font-semibold">{plan.name}</span>
              <span className="text-slate-300">
                {plan.type === 'FREE'
                  ? 'Free'
                  : `${(plan.priceCents / 100).toFixed(2)} ${plan.currency}`}
                {!plan.isActive && <span className="ml-2 text-red-400">(inactive)</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-400">No pricing plans yet.</p>
      )}
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <FormError message={error} />
        <Field label="Plan name" type="text" value={name} onChange={setName} />
        <Field label="Price in USD (0 = free)" type="text" value={price} onChange={setPrice} />
        <SubmitButton label="Add plan" pending={pending} />
      </form>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onApply,
  onDismiss,
  pending,
}: {
  suggestion: AiListingSuggestion;
  onApply: () => void;
  onDismiss: () => void;
  pending: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-surface px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-brand-500">{suggestion.field.toLowerCase()}</span>
        <span className="text-xs uppercase text-slate-500">{suggestion.status.toLowerCase()}</span>
      </div>
      {suggestion.currentValue && (
        <p className="mt-2 text-slate-400 line-through">{suggestion.currentValue}</p>
      )}
      <p className="mt-1 text-slate-100">{suggestion.suggestedValue}</p>
      <p className="mt-1 text-slate-400">{suggestion.reason}</p>
      {suggestion.status === 'PENDING' && suggestion.field !== 'DOC' && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onApply}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
          >
            Apply
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onDismiss}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:border-white/30 disabled:opacity-60"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function DeveloperAssistantSection({
  productId,
  accessToken,
  onProductChange,
}: {
  productId: string;
  accessToken: string;
  onProductChange: (product: Product) => void;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<AiListingSuggestion[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const reloadSuggestions = useCallback(() => {
    listProductSuggestions(accessToken, productId)
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, [accessToken, productId]);

  useEffect(() => {
    reloadSuggestions();
    createDeveloperAssistantSession(accessToken, productId)
      .then((session) => setSessionId(session.id))
      .catch((cause) => {
        if (cause instanceof ApiClientError && cause.code === 'SERVICE_UNAVAILABLE') {
          setUnavailable(true);
        }
      });
  }, [accessToken, productId, reloadSuggestions]);

  if (unavailable) {
    return (
      <div className="rounded-xl bg-surface-muted p-6">
        <h2 className="text-lg font-semibold">AI Listing Assistant</h2>
        <p className="mt-2 text-sm text-amber-300">
          Configure <code>AI_PROVIDER</code> on the API to enable listing coaching.
        </p>
      </div>
    );
  }

  async function onAnalyze() {
    setPending(true);
    setError(null);
    try {
      const result = await analyzeProductListing(accessToken, productId);
      setMessages((previous) => [
        ...previous,
        {
          id: `analysis-${Date.now()}`,
          role: 'ASSISTANT',
          content: result.summary,
          createdAt: new Date().toISOString(),
        },
      ]);
      setSuggestions(result.suggestions);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Analysis failed');
    } finally {
      setPending(false);
    }
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
      const result = await sendDeveloperAssistantMessage(accessToken, sessionId, content);
      setMessages((previous) => [...previous, result.message]);
      if (result.suggestions.length > 0) {
        setSuggestions((previous) => [...result.suggestions, ...previous]);
      }
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  async function onResolve(suggestionId: string, action: 'APPLY' | 'DISMISS') {
    setPending(true);
    setError(null);
    try {
      await resolveProductSuggestion(accessToken, productId, suggestionId, action);
      reloadSuggestions();
      if (action === 'APPLY') {
        const refreshed = await getOwnProduct(accessToken, productId);
        onProductChange(refreshed);
      }
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Could not update suggestion');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl bg-surface-muted p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">AI Listing Assistant</h2>
          <p className="mt-1 text-sm text-slate-400">
            Get coaching on taglines, descriptions, categories, and release notes.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => void onAnalyze()}
          className="rounded-lg border border-brand-500/40 px-4 py-2 text-sm font-semibold text-brand-500 hover:border-brand-500 disabled:opacity-60"
        >
          Analyze listing
        </button>
      </div>

      <div className="mt-4 max-h-64 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">
            Ask: &quot;How should I position this for finance teams?&quot;
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-lg px-3 py-2 text-sm ${
              message.role === 'USER'
                ? 'ml-8 bg-brand-600/20 text-slate-100'
                : 'mr-8 bg-surface text-slate-200'
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-slate-300">Suggestions</p>
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              pending={pending}
              onApply={() => void onResolve(suggestion.id, 'APPLY')}
              onDismiss={() => void onResolve(suggestion.id, 'DISMISS')}
            />
          ))}
        </div>
      )}

      <FormError message={error} />
      <form onSubmit={onSubmit} className="mt-4 flex gap-3">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={2000}
          placeholder="Ask about your listing…"
          className="flex-1 rounded-lg border border-white/10 bg-surface px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
        />
        <SubmitButton label="Send" pending={pending || !sessionId} />
      </form>
    </div>
  );
}

export default function ProductEditorPage() {
  const params = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useMessage();
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    getOwnProduct(accessToken, params.id)
      .then(setProduct)
      .catch(() => setProduct(null));
  }, [accessToken, params.id]);

  if (!accessToken) {
    return null;
  }
  if (!product) {
    return <div className="mx-auto max-w-3xl px-6 py-12 text-slate-400">Loading…</div>;
  }

  async function onPublishToggle() {
    setActionPending(true);
    setError(null);
    try {
      const updated =
        product!.status === 'PUBLISHED'
          ? await archiveProduct(accessToken!, product!.id)
          : await publishProduct(accessToken!, product!.id);
      setProduct(updated);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
    } finally {
      setActionPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Status: {product.status.toLowerCase()}
            {product.status === 'PUBLISHED' && (
              <>
                {' '}
                ·{' '}
                <Link
                  href={`/marketplace/${product.slug}`}
                  className="text-brand-500 hover:underline"
                >
                  view public page
                </Link>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          disabled={actionPending}
          onClick={() => void onPublishToggle()}
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
            product.status === 'PUBLISHED'
              ? 'border border-red-400/40 text-red-400 hover:border-red-400'
              : 'bg-brand-600 text-white hover:bg-brand-500'
          }`}
        >
          {product.status === 'PUBLISHED' ? 'Archive' : 'Publish'}
        </button>
      </div>

      <div className="mt-4">
        <FormError message={error} />
      </div>

      <div className="mt-8 space-y-6">
        <DetailsSection product={product} accessToken={accessToken} onChange={setProduct} />
        <DeveloperAssistantSection
          productId={product.id}
          accessToken={accessToken}
          onProductChange={setProduct}
        />
        <VersionsSection productId={product.id} accessToken={accessToken} />
        <PricingSection productId={product.id} accessToken={accessToken} />
      </div>
    </div>
  );
}
