import { ClipboardTextIcon, CrosshairIcon, FadersIcon, ListBulletsIcon, MagnifyingGlassIcon, MapTrifoldIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { RequestsMap } from '../components/LazyMaps.jsx';
import { RequestCard } from '../components/RequestCard.jsx';
import { Button, ButtonLink } from '../components/ui/Button.jsx';
import { Field, Input, Select } from '../components/ui/Field.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { PageHeader, Pagination, Tabs } from '../components/ui/Nav.jsx';
import { CardListSkeleton, EmptyState, ErrorState, InlineAlert } from '../components/ui/States.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocketEvent } from '../context/RealtimeContext.jsx';
import { URGENCY } from '../lib/format.js';
import { useApi, useDebounce, useDocumentTitle, useMediaQuery } from '../lib/hooks.js';
import { pushRecentSearch } from '../lib/storage.js';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'fewest_offers', label: 'Fewest offers' },
  { value: 'budget', label: 'Highest budget' },
  { value: 'nearest', label: 'Nearest to me' },
  { value: 'oldest', label: 'Oldest first' },
];

const POSTED = [
  { value: '', label: 'Any time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '3d', label: 'Last 3 days' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

function Filters({ params, update, myCategories }) {
  const { categories, cities, areasFor } = useAppData();
  const city = params.get('city') || '';
  const hasPoint = params.get('lat') && params.get('lng');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoError('Location is not supported by this browser.');
      return;
    }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        update({ lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5), radiusKm: params.get('radiusKm') || '10', sort: 'nearest' });
      },
      () => {
        setLocating(false);
        setGeoError('Location permission was denied. Choose a city and area instead.');
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="space-y-5">
      <Field label="Service">
        {(p) => (
          <Select {...p} value={params.get('category') || ''} onChange={(e) => update({ category: e.target.value })}>
            <option value="">All services</option>
            {myCategories && <option value={myCategories}>My services</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="City">
        {(p) => (
          <Select {...p} value={city} onChange={(e) => update({ city: e.target.value, area: '' })}>
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {city && (
        <Field label="Area">
          {(p) => (
            <Select {...p} value={params.get('area') || ''} onChange={(e) => update({ area: e.target.value })}>
              <option value="">All areas</option>
              {areasFor(city).map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <Field label="Urgency">
        {(p) => (
          <Select {...p} value={params.get('urgency') || ''} onChange={(e) => update({ urgency: e.target.value })}>
            <option value="">Any urgency</option>
            {Object.entries(URGENCY).map(([v, u]) => (
              <option key={v} value={v}>
                {u.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Posted">
        {(p) => (
          <Select {...p} value={params.get('postedWithin') || ''} onChange={(e) => update({ postedWithin: e.target.value })}>
            {POSTED.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <p className="text-sm font-semibold text-ink">Distance</p>
        {hasPoint ? (
          <div className="mt-3 space-y-3">
            <Field label="Within">
              {(p) => (
                <Select {...p} value={params.get('radiusKm') || '10'} onChange={(e) => update({ radiusKm: e.target.value })}>
                  {[3, 5, 10, 20, 40].map((k) => (
                    <option key={k} value={k}>
                      {k} km
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button variant="ghost" size="sm" icon={XIcon} onClick={() => update({ lat: '', lng: '', radiusKm: '', sort: params.get('sort') === 'nearest' ? '' : params.get('sort') })}>
              Stop using my location
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-[0.82rem] text-muted">Show requests near you and sort by distance.</p>
            <Button variant="secondary" size="sm" className="mt-3" icon={CrosshairIcon} loading={locating} onClick={locate}>
              Use my location
            </Button>
          </>
        )}
        {geoError && (
          <p className="mt-2 text-[0.82rem] text-danger" role="alert">
            {geoError}
          </p>
        )}
      </div>
    </div>
  );
}

export default function BrowseRequests({ forProvider = false }) {
  const { user } = useAuth();
  const { categories } = useAppData();
  useDocumentTitle(forProvider ? 'Find work' : 'Open requests');
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const debouncedQ = useDebounce(q, 400);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const view = params.get('view') === 'map' ? 'map' : 'list';
  const [fresh, setFresh] = useState(0);

  const myCategories = useMemo(() => {
    if (user?.role !== 'provider') return '';
    const ids = user.provider?.categories?.map((c) => c.id) || [];
    return categories.filter((c) => ids.includes(c.id)).map((c) => c.slug).join(',');
  }, [user, categories]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v === null || v === undefined) next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  // Providers start with their own services selected.
  useEffect(() => {
    if (forProvider && myCategories && !params.get('category') && !params.get('all')) update({ category: myCategories });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forProvider, myCategories]);

  useEffect(() => {
    if ((params.get('q') || '') !== debouncedQ) {
      update({ q: debouncedQ });
      if (debouncedQ.trim().length > 2) pushRecentSearch(debouncedQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const query = useMemo(() => {
    const out = {};
    for (const k of ['category', 'city', 'area', 'urgency', 'postedWithin', 'q', 'lat', 'lng', 'radiusKm', 'sort', 'page']) {
      const v = params.get(k);
      if (v) out[k] = v;
    }
    if (view === 'map') out.limit = 50;
    return out;
  }, [params, view]);

  const { data, loading, error, reload } = useApi('/requests', query);

  useSocketEvent('request:new', () => setFresh((n) => n + 1));

  const activeFilters = ['category', 'city', 'area', 'urgency', 'postedWithin', 'lat'].filter((k) => params.get(k)).length;
  const center = params.get('lat') ? { lat: Number(params.get('lat')), lng: Number(params.get('lng')) } : null;

  return (
    <div className="container-page py-8 sm:py-10">
      <PageHeader
        title={forProvider ? 'Find work' : 'Open requests'}
        description={
          forProvider
            ? 'New jobs in your services. Send a clear price and arrival time to win the job.'
            : 'Jobs posted by customers in Islamabad and Rawalpindi. Providers can send offers on any open request.'
        }
        actions={
          !user ? (
            <ButtonLink to="/register?role=provider" variant="secondary">
              Become a provider
            </ButtonLink>
          ) : null
        }
      />

      {user?.role === 'provider' && user.provider?.verification?.status !== 'verified' && (
        <div className="mb-6">
          <InlineAlert tone="warning" title="Get verified to send offers" action={<ButtonLink to="/provider/profile#verification" size="sm" variant="secondary">Verify now</ButtonLink>}>
            You can browse requests now. Offers unlock once our team checks your ID.
          </InlineAlert>
        </div>
      )}

      {fresh > 0 && (
        <div className="mb-4">
          <InlineAlert
            tone="accent"
            title={`${fresh} new request${fresh === 1 ? '' : 's'} just posted`}
            action={
              <Button
                size="sm"
                onClick={() => {
                  setFresh(0);
                  reload();
                }}
              >
                Show
              </Button>
            }
          />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        {isDesktop && (
          <aside aria-label="Filters" className="lg:sticky lg:top-28 lg:self-start">
            <Filters params={params} update={update} myCategories={myCategories} />
          </aside>
        )}

        <div className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <label htmlFor="req-search" className="sr-only">
                Search requests
              </label>
              <MagnifyingGlassIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input id="req-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by keyword or area…" className="rounded-full pl-10" />
            </div>
            <div className="flex items-center gap-2">
              {!isDesktop && (
                <Button variant="secondary" icon={FadersIcon} onClick={() => setFiltersOpen(true)}>
                  Filters{activeFilters ? ` (${activeFilters})` : ''}
                </Button>
              )}
              <label htmlFor="req-sort" className="sr-only">
                Sort by
              </label>
              <Select id="req-sort" value={params.get('sort') || 'newest'} onChange={(e) => update({ sort: e.target.value })} className="rounded-full">
                {SORTS.filter((s) => s.value !== 'nearest' || params.get('lat')).map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {loading ? 'Loading requests…' : data ? `${data.total} open request${data.total === 1 ? '' : 's'}` : ''}
            </p>
            <Tabs
              label="View"
              value={view}
              onChange={(v) => update({ view: v === 'list' ? '' : v })}
              items={[
                { value: 'list', label: (<span className="inline-flex items-center gap-1.5"><ListBulletsIcon size={16} aria-hidden="true" />List</span>) },
                { value: 'map', label: (<span className="inline-flex items-center gap-1.5"><MapTrifoldIcon size={16} aria-hidden="true" />Map</span>) },
              ]}
            />
          </div>

          {error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : loading && !data ? (
            <CardListSkeleton count={5} />
          ) : data?.items.length === 0 ? (
            <EmptyState
              icon={ClipboardTextIcon}
              title="No open requests match"
              description="Try a different service or area, or widen the distance. New requests appear here the moment they are posted."
              action={
                activeFilters || params.get('q') ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQ('');
                      setParams(forProvider ? { all: '1' } : {}, { replace: true });
                    }}
                  >
                    Clear all filters
                  </Button>
                ) : null
              }
            />
          ) : view === 'map' ? (
            <RequestsMap requests={data.items} center={center} />
          ) : (
            <>
              <ul className={`grid gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                {data.items.map((r) => (
                  <li key={r.id}>
                    <RequestCard request={r} />
                  </li>
                ))}
              </ul>
              <Pagination className="mt-8" page={data.page} pages={data.pages} onChange={(p) => update({ page: String(p) })} />
            </>
          )}
        </div>
      </div>

      <Modal
        open={filtersOpen && !isDesktop}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setParams(forProvider ? { all: '1' } : {}, { replace: true });
                setFiltersOpen(false);
              }}
            >
              Clear all
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Show results</Button>
          </>
        }
      >
        <Filters params={params} update={update} myCategories={myCategories} />
      </Modal>
    </div>
  );
}
