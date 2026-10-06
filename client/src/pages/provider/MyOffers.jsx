import { ArrowRightIcon, ClockIcon, MapPinIcon, TagIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { OfferStatusBadge, RequestStatusBadge } from '../../components/ui/Badge.jsx';
import { Button, ButtonLink } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { PageHeader, Pagination, Tabs } from '../../components/ui/Nav.jsx';
import { CardListSkeleton, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { eta, pkr, timeAgo } from '../../lib/format.js';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';
import { CategoryIcon } from '../../lib/icons.jsx';

export default function MyOffers() {
  useDocumentTitle('My offers');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const page = Number(params.get('page')) || 1;
  const { data, loading, error, reload } = useApi('/offers/mine', { status, page });
  const [withdrawing, setWithdrawing] = useState(null);
  const [busy, setBusy] = useState(false);
  const counts = data?.counts || {};

  const withdraw = async () => {
    setBusy(true);
    try {
      await api.post(`/offers/${withdrawing.id}/withdraw`);
      toast.success('Offer withdrawn.');
      setWithdrawing(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending', count: counts.pending || 0 },
    { value: 'accepted', label: 'Won', count: counts.accepted || 0 },
    { value: 'rejected', label: 'Not selected', count: counts.rejected || 0 },
    { value: 'withdrawn', label: 'Withdrawn', count: counts.withdrawn || 0 },
  ];

  return (
    <div className="container-page py-8 sm:py-10">
      <PageHeader title="My offers" description="Every offer you have sent and where it stands." actions={<ButtonLink to="/provider/requests">Find more work</ButtonLink>} />
      <Tabs className="mb-6" label="Filter offers" value={status} onChange={(v) => setParams(v ? { status: v } : {}, { replace: true })} items={tabs} />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <CardListSkeleton count={4} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={TagIcon} title="No offers here" description="Browse open requests in your services and send your first offer." action={<ButtonLink to="/provider/requests">Find work</ButtonLink>} />
      ) : (
        <>
          <ul className={`grid gap-3 ${loading ? 'opacity-60' : ''}`}>
            {data.items.map((o) => {
              const r = o.request;
              return (
                <li key={o.id} className="rounded-card border border-line bg-surface p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[0.8rem] font-semibold text-accent-text">
                          <CategoryIcon name={r.category?.icon} size={14} />
                          {r.category?.name}
                        </span>
                        <OfferStatusBadge status={o.status} />
                        <RequestStatusBadge status={r.status} short />
                      </div>
                      <h2 className="mt-1.5 text-lg font-bold text-ink">
                        <Link to={`/requests/${r.id}`} className="hover:underline">
                          {r.title}
                        </Link>
                      </h2>
                      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[0.82rem] text-muted">
                        <span className="inline-flex items-center gap-1">
                          <MapPinIcon size={15} aria-hidden="true" />
                          {r.location.area}, {r.location.city}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon size={15} aria-hidden="true" />
                          Offer sent {timeAgo(o.createdAt)}
                        </span>
                        <span>
                          {r.offerCount} competing offer{r.offerCount === 1 ? '' : 's'}
                          {r.lowestOffer && r.status === 'open' ? `, lowest ${pkr(r.lowestOffer)}` : ''}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 sm:text-right">
                      <p className="font-display text-2xl font-bold text-ink">{pkr(o.price)}</p>
                      <p className="text-sm text-muted">Arrival within {eta(o.etaMinutes)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    <ButtonLink to={`/requests/${r.id}`} variant="secondary" size="sm" trailingIcon={ArrowRightIcon}>
                      {o.status === 'accepted' ? 'Open job' : 'View request'}
                    </ButtonLink>
                    {o.status === 'pending' && r.status === 'open' && (
                      <Button variant="danger-ghost" size="sm" onClick={() => setWithdrawing(o)}>
                        Withdraw
                      </Button>
                    )}
                    {o.status === 'accepted' && r.status === 'assigned' && <span className="text-sm font-semibold text-success">You are hired. Contact details are on the job page.</span>}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination className="mt-8" page={data.page} pages={data.pages} onChange={(p) => setParams({ ...(status ? { status } : {}), page: String(p) }, { replace: true })} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(withdrawing)}
        onClose={() => setWithdrawing(null)}
        onConfirm={withdraw}
        busy={busy}
        tone="danger"
        title="Withdraw this offer?"
        description="The customer will no longer see it. You can send a new one while the request is open."
        confirmLabel="Withdraw"
      />
    </div>
  );
}
