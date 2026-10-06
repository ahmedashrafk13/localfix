import { MagnifyingGlassIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ProviderCard } from '../components/ProviderCard.jsx';
import { Button, ButtonLink } from '../components/ui/Button.jsx';
import { Checkbox, Input, Select } from '../components/ui/Field.jsx';
import { PageHeader, Pagination } from '../components/ui/Nav.jsx';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi, useDebounce, useDocumentTitle } from '../lib/hooks.js';
import { CategoryIcon } from '../lib/icons.jsx';
import { pushRecentSearch } from '../lib/storage.js';

export default function Providers() {
  useDocumentTitle('Find providers');
  const { user } = useAuth();
  const { categories, cities } = useAppData();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const debouncedQ = useDebounce(q, 400);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if ((params.get('q') || '') !== debouncedQ) {
      update({ q: debouncedQ });
      if (debouncedQ.trim().length > 2) pushRecentSearch(debouncedQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  useEffect(() => {
    setQ(params.get('q') || '');
  }, [params]);

  const query = useMemo(() => {
    const out = { limit: 12 };
    for (const k of ['category', 'city', 'q', 'minRating', 'availableNow', 'sort', 'page']) {
      if (params.get(k)) out[k] = params.get(k);
    }
    return out;
  }, [params]);

  const { data, loading, error, reload } = useApi('/providers', query);
  const activeCategory = params.get('category') || '';

  return (
    <div className="container-page py-8 sm:py-10">
      <PageHeader
        title="Find a trusted provider"
        description="Every provider listed here has passed an ID check. Ratings come only from customers who completed a job."
        actions={
          !user || user.role === 'customer' ? (
            <ButtonLink to={`/post-request${activeCategory ? `?category=${activeCategory}` : ''}`}>Post a request</ButtonLink>
          ) : null
        }
      />

      <nav aria-label="Filter by service" className="scrollbar-none -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-2">
          <li>
            <button
              type="button"
              onClick={() => update({ category: '' })}
              aria-pressed={!activeCategory}
              className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${
                !activeCategory ? 'border-ink bg-ink text-bg' : 'border-line-strong bg-surface text-ink-2 hover:border-ink/30'
              }`}
            >
              All services
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => update({ category: c.slug })}
                aria-pressed={activeCategory === c.slug}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${
                  activeCategory === c.slug ? 'border-ink bg-ink text-bg' : 'border-line-strong bg-surface text-ink-2 hover:border-ink/30'
                }`}
              >
                <CategoryIcon name={c.icon} size={16} />
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mb-6 grid gap-3 rounded-card border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto] lg:items-center">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <label htmlFor="pro-search" className="sr-only">
            Search providers
          </label>
          <MagnifyingGlassIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input id="pro-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, skill or area…" className="rounded-full pl-10" />
        </div>
        <div>
          <label htmlFor="pro-city" className="sr-only">
            City
          </label>
          <Select id="pro-city" value={params.get('city') || ''} onChange={(e) => update({ city: e.target.value })} className="rounded-full">
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="pro-rating" className="sr-only">
            Minimum rating
          </label>
          <Select id="pro-rating" value={params.get('minRating') || ''} onChange={(e) => update({ minRating: e.target.value })} className="rounded-full">
            <option value="">Any rating</option>
            <option value="4">4 stars and up</option>
            <option value="4.5">4.5 stars and up</option>
          </Select>
        </div>
        <div>
          <label htmlFor="pro-sort" className="sr-only">
            Sort by
          </label>
          <Select id="pro-sort" value={params.get('sort') || 'rating'} onChange={(e) => update({ sort: e.target.value === 'rating' ? '' : e.target.value })} className="rounded-full">
            <option value="rating">Highest rated</option>
            <option value="jobs">Most jobs done</option>
            <option value="experience">Most experienced</option>
            <option value="newest">Newest</option>
          </Select>
        </div>
        <Checkbox label="Available now" checked={params.get('availableNow') === 'true'} onChange={(e) => update({ availableNow: e.target.checked ? 'true' : '' })} className="px-2" />
      </div>

      <p className="mb-4 text-sm text-muted" aria-live="polite">
        {loading && !data ? 'Loading providers…' : data ? `${data.total} verified provider${data.total === 1 ? '' : 's'}` : ''}
      </p>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-64 rounded-card" />
            </li>
          ))}
        </ul>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={UsersThreeIcon}
          title="No providers match these filters"
          description="Try another service or city. You can also post a request and let providers come to you."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQ('');
                setParams({}, { replace: true });
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <ul className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
            {data.items.map((p) => (
              <li key={p.id}>
                <ProviderCard provider={p} />
              </li>
            ))}
          </ul>
          <Pagination className="mt-8" page={data.page} pages={data.pages} onChange={(p) => update({ page: String(p) })} />
        </>
      )}
    </div>
  );
}
