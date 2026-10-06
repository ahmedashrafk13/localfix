import { EyeIcon, EyeSlashIcon, StarIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Checkbox, Select } from '../../components/ui/Field.jsx';
import { PageHeader, Pagination } from '../../components/ui/Nav.jsx';
import { CardListSkeleton, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import { Stars } from '../../components/ui/Stars.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';

export default function Reviews() {
  useDocumentTitle('Reviews');
  const toast = useToast();
  const [rating, setRating] = useState('');
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [page, setPage] = useState(1);
  const { data, loading, error, reload, setData } = useApi('/admin/reviews', { rating, hidden: hiddenOnly ? 'true' : undefined, page });
  const [busy, setBusy] = useState('');

  const toggle = async (r) => {
    setBusy(r.id);
    try {
      await api.patch(`/admin/reviews/${r.id}`, { hidden: !r.hidden });
      setData((d) => ({ ...d, items: d.items.map((x) => (x.id === r.id ? { ...x, hidden: !r.hidden } : x)) }));
      toast.success(r.hidden ? 'Review is visible again.' : 'Review hidden and removed from the rating.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <PageHeader title="Reviews" description="Hidden reviews disappear from profiles and no longer count towards ratings." />
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div>
          <label htmlFor="rv-rating" className="sr-only">Rating</label>
          <Select id="rv-rating" value={rating} onChange={(e) => { setRating(e.target.value); setPage(1); }} className="rounded-full">
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>
            ))}
          </Select>
        </div>
        <Checkbox label="Hidden only" checked={hiddenOnly} onChange={(e) => { setHiddenOnly(e.target.checked); setPage(1); }} />
      </div>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <CardListSkeleton count={4} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={StarIcon} title="No reviews found" description="Try a different filter." />
      ) : (
        <>
          <ul className={`grid gap-3 ${loading ? 'opacity-60' : ''}`}>
            {data.items.map((r) => (
              <li key={r.id} className={`rounded-card border bg-surface p-5 ${r.hidden ? 'border-dashed border-line-strong' : 'border-line'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars value={r.rating} size={14} />
                      {r.hidden && <Badge tone="neutral" icon={EyeSlashIcon}>Hidden</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {r.customer.name} reviewed{' '}
                      {r.provider?.id ? <Link to={`/providers/${r.provider.id}`} className="font-semibold text-ink hover:underline">{r.provider.name}</Link> : 'a deleted provider'}
                      {r.request?.title ? ` for "${r.request.title}"` : ''}, {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <Button size="sm" variant={r.hidden ? 'secondary' : 'danger-ghost'} icon={r.hidden ? EyeIcon : EyeSlashIcon} loading={busy === r.id} onClick={() => toggle(r)}>
                    {r.hidden ? 'Unhide' : 'Hide'}
                  </Button>
                </div>
                {r.comment && <p className="mt-3 text-ink-2">{r.comment}</p>}
              </li>
            ))}
          </ul>
          <Pagination className="mt-6" page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
