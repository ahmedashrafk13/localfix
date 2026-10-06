import { ArrowCounterClockwiseIcon, ClipboardTextIcon, MagnifyingGlassIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Badge, RequestStatusBadge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Checkbox, Field, Input, Select } from '../../components/ui/Field.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { PageHeader, Pagination } from '../../components/ui/Nav.jsx';
import { CardListSkeleton, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatDate, plural } from '../../lib/format.js';
import { useApi, useDebounce, useDocumentTitle } from '../../lib/hooks.js';
import { CategoryIcon } from '../../lib/icons.jsx';

export default function Requests() {
  useDocumentTitle('Manage requests');
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [removedOnly, setRemovedOnly] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q, 350);
  const { data, loading, error, reload } = useApi('/admin/requests', { status, removed: removedOnly ? 'true' : undefined, q: debounced, page });
  const [removing, setRemoving] = useState(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [busy, setBusy] = useState('');

  const remove = async () => {
    if (reason.trim().length < 3) {
      setReasonError('Give a reason. The customer will see it.');
      return;
    }
    setBusy(removing.id);
    try {
      await api.del(`/admin/requests/${removing.id}`, { reason: reason.trim() });
      toast.success('Request removed. The customer and bidders were notified.');
      setRemoving(null);
      setReason('');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const restore = async (r) => {
    setBusy(r.id);
    try {
      await api.post(`/admin/requests/${r.id}/restore`);
      toast.success('Request restored.');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <PageHeader title="Requests" description="Every request on the platform, including removed ones." />
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <div className="relative">
          <label htmlFor="ar-q" className="sr-only">Search requests</label>
          <MagnifyingGlassIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input id="ar-q" type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Title or description…" className="rounded-full pl-10" />
        </div>
        <div>
          <label htmlFor="ar-status" className="sr-only">Status</label>
          <Select id="ar-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-full">
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="assigned">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        <Checkbox label="Removed only" checked={removedOnly} onChange={(e) => { setRemovedOnly(e.target.checked); setPage(1); }} className="px-2" />
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <CardListSkeleton count={5} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={ClipboardTextIcon} title="No requests found" description="Try a different filter." />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">{plural(data.total, 'request')}</p>
          <ul className={`divide-y divide-line overflow-hidden rounded-card border border-line bg-surface ${loading ? 'opacity-60' : ''}`}>
            {data.items.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-text">
                      <CategoryIcon name={r.category?.icon} size={13} />{r.category?.name}
                    </span>
                    <RequestStatusBadge status={r.status} short />
                    {r.removed && <Badge tone="danger">Removed</Badge>}
                  </div>
                  <p className="mt-1 truncate font-semibold text-ink">
                    <Link to={`/requests/${r.id}`} className="hover:underline">{r.title}</Link>
                  </p>
                  <p className="text-xs text-muted">
                    {r.customer?.name}, {r.location.area}, {r.location.city}. Posted {formatDate(r.createdAt)}. {plural(r.offerCount, 'offer')}.
                  </p>
                </div>
                <div className="shrink-0">
                  {r.removed ? (
                    <Button size="sm" variant="secondary" icon={ArrowCounterClockwiseIcon} loading={busy === r.id} onClick={() => restore(r)}>Restore</Button>
                  ) : (
                    <Button size="sm" variant="danger-ghost" icon={TrashIcon} onClick={() => { setRemoving(r); setReasonError(''); }}>Remove</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination className="mt-6" page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}

      <Modal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Remove this request?"
        description={removing?.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button>
            <Button variant="danger" loading={busy === removing?.id} onClick={remove}>Remove request</Button>
          </>
        }
      >
        <Field label="Reason" required error={reasonError} help="Sent to the customer. Open offers are declined.">
          {(p) => <Input {...p} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </Modal>
    </div>
  );
}
