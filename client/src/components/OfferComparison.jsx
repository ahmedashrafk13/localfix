import {
  ArrowCounterClockwiseIcon,
  CardsIcon,
  ChatCircleDotsIcon,
  CheckCircleIcon,
  ClockIcon,
  HandshakeIcon,
  LightningIcon,
  PackageIcon,
  ShieldCheckIcon,
  StarIcon,
  TableIcon,
  TrophyIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { eta, pkr, timeAgo } from '../lib/format.js';
import { useApi, useMediaQuery } from '../lib/hooks.js';
import { Avatar } from './ui/Avatar.jsx';
import { Badge, OfferStatusBadge, VerifiedBadge } from './ui/Badge.jsx';
import { Button } from './ui/Button.jsx';
import { Checkbox, Select } from './ui/Field.jsx';
import { ConfirmDialog } from './ui/Modal.jsx';
import { Tabs } from './ui/Nav.jsx';
import { CardListSkeleton, EmptyState, ErrorState } from './ui/States.jsx';
import { Stars } from './ui/Stars.jsx';

const SORTS = [
  { value: 'price', label: 'Price' },
  { value: 'rating', label: 'Rating' },
  { value: 'experience', label: 'Experience' },
  { value: 'eta', label: 'Arrival' },
];

function Highlights({ offer, highlights }) {
  const items = [];
  if (highlights.lowestPrice === offer.id) items.push({ icon: TrophyIcon, label: 'Lowest price', tone: 'success' });
  if (highlights.fastest === offer.id) items.push({ icon: LightningIcon, label: 'Fastest arrival', tone: 'info' });
  if (highlights.topRated === offer.id) items.push({ icon: StarIcon, label: 'Top rated', tone: 'warning' });
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((h) => (
        <Badge key={h.label} tone={h.tone} icon={h.icon}>
          {h.label}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Side-by-side comparison of the offers on a request (objective O3), with chat and accept actions.
 * Cards on phones, cards or a comparison table on larger screens.
 */
export function OfferComparison({ request, onAccepted, reloadKey }) {
  const toast = useToast();
  const navigate = useNavigate();
  const wide = useMediaQuery('(min-width: 900px)');
  const [sort, setSort] = useState('price');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState('');
  const [view, setView] = useState('cards');
  const [accepting, setAccepting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState('');

  const { data, loading, error, reload } = useApi(`/requests/${request.id}/offers`, {
    sort,
    verifiedOnly: verifiedOnly ? 'true' : undefined,
    minRating: minRating || undefined,
    _k: reloadKey,
  });

  const items = data?.items || [];
  const highlights = data?.highlights || {};
  const pending = items.filter((o) => o.status === 'pending');

  const openChat = async (offer) => {
    if (offer.conversation) return navigate(`/messages/${offer.conversation.id}`);
    setChatBusy(offer.id);
    try {
      const res = await api.post('/conversations', { requestId: request.id, providerId: offer.provider.id });
      navigate(`/messages/${res.conversation.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setChatBusy('');
    }
  };

  const accept = async () => {
    setBusy(true);
    try {
      await api.post(`/offers/${accepting.id}/accept`);
      toast.success(`You hired ${accepting.provider.name}. They can now see your address and phone number.`);
      setAccepting(null);
      onAccepted?.();
    } catch (err) {
      toast.error(err.message);
      reload();
    } finally {
      setBusy(false);
    }
  };

  const actions = (o, compact) => (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-4'}`}>
      {o.status === 'pending' && (
        <Button size={compact ? 'sm' : 'md'} icon={HandshakeIcon} onClick={() => setAccepting(o)}>
          Accept
        </Button>
      )}
      <Button size={compact ? 'sm' : 'md'} variant="secondary" icon={ChatCircleDotsIcon} loading={chatBusy === o.id} onClick={() => openChat(o)}>
        Chat
        {o.conversation?.unread ? (
          <span className="rounded-full bg-accent px-1.5 text-xs font-bold leading-5 text-on-accent">
            {o.conversation.unread}
            <span className="sr-only"> unread</span>
          </span>
        ) : null}
      </Button>
      {!compact && (
        <Link to={`/providers/${o.provider.id}`} className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-accent-text hover:underline">
          View profile
        </Link>
      )}
    </div>
  );

  return (
    <section aria-labelledby="offers-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="offers-heading" className="text-xl font-bold text-ink">
            Compare offers{' '}
            <span className="text-muted" aria-live="polite">
              ({pending.length} active)
            </span>
          </h2>
          <p className="text-sm text-muted">Sort by what matters to you. Chat before you choose. You can accept one offer.</p>
        </div>
        {wide && (
          <Tabs
            label="Layout"
            value={view}
            onChange={setView}
            items={[
              { value: 'cards', label: (<span className="inline-flex items-center gap-1.5"><CardsIcon size={16} aria-hidden="true" />Cards</span>) },
              { value: 'table', label: (<span className="inline-flex items-center gap-1.5"><TableIcon size={16} aria-hidden="true" />Table</span>) },
            ]}
          />
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Tabs label="Sort offers by" value={sort} onChange={setSort} items={SORTS} />
        <div className="flex flex-wrap items-center gap-4 sm:ml-auto">
          <Checkbox label="Verified only" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
          <label htmlFor="min-rating" className="sr-only">
            Minimum rating
          </label>
          <Select id="min-rating" value={minRating} onChange={(e) => setMinRating(e.target.value)} className="min-h-10 rounded-full py-1.5 text-sm">
            <option value="">Any rating</option>
            <option value="3">3 stars and up</option>
            <option value="4">4 stars and up</option>
            <option value="4.5">4.5 stars and up</option>
          </Select>
        </div>
      </div>

      <div className="mt-5">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <CardListSkeleton count={3} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ClockIcon}
            title={verifiedOnly || minRating ? 'No offers match these filters' : 'Waiting for the first offer'}
            description={
              verifiedOnly || minRating
                ? 'Clear the filters to see every offer.'
                : 'Matching providers have been notified. Most requests get their first offer within the hour. We will notify you instantly.'
            }
          />
        ) : view === 'table' && wide ? (
          <div className="overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <caption className="sr-only">Offers compared side by side</caption>
              <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Provider</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Arrival</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Rating</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Experience</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Warranty</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Materials</th>
                  <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((o) => (
                  <tr key={o.id} className={o.status !== 'pending' ? 'opacity-60' : ''}>
                    <th scope="row" className="px-4 py-3 font-normal">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={o.provider.avatar} name={o.provider.name} size="sm" />
                        <div>
                          <Link to={`/providers/${o.provider.id}`} className="inline-flex items-center gap-1 font-semibold text-ink hover:underline">
                            {o.provider.name}
                            {o.provider.verified && <VerifiedBadge compact />}
                          </Link>
                          <div className="mt-0.5">
                            <Highlights offer={o} highlights={highlights} />
                          </div>
                        </div>
                      </div>
                    </th>
                    <td className="px-4 py-3 font-display text-base font-bold tabular-nums text-ink">{pkr(o.price)}</td>
                    <td className="px-4 py-3 text-ink-2">{eta(o.etaMinutes)}</td>
                    <td className="px-4 py-3">
                      <Stars value={o.provider.ratingAvg} showValue count={o.provider.ratingCount} size={13} />
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {o.provider.experienceYears} yrs, {o.provider.jobsCompleted} jobs
                    </td>
                    <td className="px-4 py-3 text-ink-2">{o.warrantyDays ? `${o.warrantyDays} days` : 'None'}</td>
                    <td className="px-4 py-3 text-ink-2">{o.includesMaterials ? 'Included' : 'Extra'}</td>
                    <td className="px-4 py-3">{o.status === 'pending' ? actions(o, true) : <OfferStatusBadge status={o.status} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul className={`grid gap-3 ${loading ? 'opacity-60' : ''}`}>
            {items.map((o) => {
              const previous = o.history.length > 1 ? o.history[0].price : null;
              return (
                <li key={o.id} className={`rounded-card border bg-surface p-5 ${o.status === 'pending' ? 'border-line' : 'border-dashed border-line-strong opacity-70'}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <Avatar src={o.provider.avatar} name={o.provider.name} size="md" online={o.provider.availableNow ? true : undefined} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-bold text-ink">
                          <Link to={`/providers/${o.provider.id}`} className="truncate hover:underline">
                            {o.provider.name}
                          </Link>
                          {o.provider.verified && <VerifiedBadge compact />}
                        </p>
                        <Stars value={o.provider.ratingAvg} showValue count={o.provider.ratingCount} size={13} />
                        <p className="mt-0.5 text-[0.82rem] text-muted">
                          {o.provider.jobsCompleted} jobs completed, {o.provider.experienceYears} years experience
                        </p>
                        <div className="mt-2">
                          <Highlights offer={o} highlights={highlights} />
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 sm:text-right">
                      <p className="font-display text-2xl font-bold tabular-nums text-ink">{pkr(o.price)}</p>
                      {previous && previous !== o.price && (
                        <p className="text-xs text-muted">
                          <ArrowCounterClockwiseIcon size={12} className="mr-1 inline" aria-hidden="true" />
                          was <span className="line-through">{pkr(previous)}</span>
                        </p>
                      )}
                      <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ink-2">
                        <ClockIcon size={15} aria-hidden="true" />
                        Arrives in {eta(o.etaMinutes)}
                      </p>
                      {o.status !== 'pending' && (
                        <div className="mt-1">
                          <OfferStatusBadge status={o.status} />
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-4 text-[0.95rem] text-ink-2">{o.details}</p>
                  <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.82rem] text-muted">
                    <li className="inline-flex items-center gap-1">
                      <ShieldCheckIcon size={15} aria-hidden="true" />
                      {o.warrantyDays ? `${o.warrantyDays}-day warranty` : 'No warranty'}
                    </li>
                    <li className="inline-flex items-center gap-1">
                      <PackageIcon size={15} aria-hidden="true" />
                      {o.includesMaterials ? 'Materials included' : 'Materials extra'}
                    </li>
                    <li>Sent {timeAgo(o.createdAt)}</li>
                  </ul>
                  {o.status === 'pending' && actions(o, false)}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(accepting)}
        onClose={() => setAccepting(null)}
        onConfirm={accept}
        busy={busy}
        title="Hire this provider?"
        confirmLabel={accepting ? `Accept ${pkr(accepting.price)}` : 'Accept'}
      >
        {accepting && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
              <Avatar src={accepting.provider.avatar} name={accepting.provider.name} size="md" />
              <div>
                <p className="flex items-center gap-1.5 font-bold text-ink">
                  {accepting.provider.name}
                  {accepting.provider.verified && <VerifiedBadge compact />}
                </p>
                <Stars value={accepting.provider.ratingAvg} showValue count={accepting.provider.ratingCount} size={13} />
              </div>
              <p className="ml-auto font-display text-xl font-bold text-ink">{pkr(accepting.price)}</p>
            </div>
            <ul className="space-y-2 text-ink-2">
              <li className="flex gap-2">
                <CheckCircleIcon size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                Your exact address and phone number will be shared with {accepting.provider.name.split(' ')[0]}.
              </li>
              <li className="flex gap-2">
                <CheckCircleIcon size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                Other providers are told politely that you chose someone else.
              </li>
              <li className="flex gap-2">
                <CheckCircleIcon size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                Pay the provider directly after the work. Never pay a large advance.
              </li>
            </ul>
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}
