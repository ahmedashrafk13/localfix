import { MagnifyingGlassIcon, ProhibitIcon, UsersIcon, ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx';
import { PageHeader, Pagination } from '../../components/ui/Nav.jsx';
import { CardListSkeleton, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatDate, timeAgo } from '../../lib/format.js';
import { useApi, useDebounce, useDocumentTitle } from '../../lib/hooks.js';

const VERIFY_TONE = { verified: 'info', pending: 'warning', rejected: 'danger', unverified: 'neutral' };

export default function Users() {
  useDocumentTitle('Users');
  const toast = useToast();
  const { reloadStats } = useOutletContext() || {};
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q, 350);
  const { data, loading, error, reload } = useApi('/admin/users', { role, status, q: debounced, page });
  const [suspending, setSuspending] = useState(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [reactivating, setReactivating] = useState(null);
  const [busy, setBusy] = useState(false);

  const changeStatus = async (user, next) => {
    if (next === 'suspended' && reason.trim().length < 3) {
      setReasonError('Give a short reason. The user sees it when they try to log in.');
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/admin/users/${user.id}/status`, { status: next, reason: reason.trim() });
      toast.success(next === 'suspended' ? `${user.name} is suspended and signed out.` : `${user.name} is active again.`);
      setSuspending(null);
      setReactivating(null);
      setReason('');
      reload();
      reloadStats?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const actions = (u) =>
    u.role === 'admin' ? null : u.status === 'active' ? (
      <Button size="sm" variant="danger-ghost" icon={ProhibitIcon} onClick={() => { setSuspending(u); setReasonError(''); }}>
        Suspend
      </Button>
    ) : (
      <Button size="sm" variant="secondary" icon={ArrowCounterClockwiseIcon} onClick={() => setReactivating(u)}>
        Reactivate
      </Button>
    );

  return (
    <div>
      <PageHeader title="Users" description="Search accounts, check verification and suspend anyone breaking the rules." />
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <label htmlFor="user-q" className="sr-only">Search users</label>
          <MagnifyingGlassIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input id="user-q" type="search" placeholder="Name, email or phone…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="rounded-full pl-10" />
        </div>
        <div>
          <label htmlFor="user-role" className="sr-only">Role</label>
          <Select id="user-role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="rounded-full">
            <option value="">All roles</option>
            <option value="customer">Customers</option>
            <option value="provider">Providers</option>
            <option value="admin">Admins</option>
          </Select>
        </div>
        <div>
          <label htmlFor="user-status" className="sr-only">Status</label>
          <Select id="user-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-full">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <CardListSkeleton count={5} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found" description="Try a different search or filter." />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted" aria-live="polite">{data.total} account{data.total === 1 ? '' : 's'}</p>
          {/* Table on wide screens */}
          <div className="hidden overflow-hidden rounded-card border border-line bg-surface lg:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">User accounts</caption>
              <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">User</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Joined</th>
                  <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-line ${loading ? 'opacity-60' : ''}`}>
                {data.items.map((u) => (
                  <tr key={u.id}>
                    <th scope="row" className="px-4 py-3 font-normal">
                      <div className="flex items-center gap-3">
                        <Avatar src={u.avatar} name={u.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">
                            {u.role === 'provider' ? <Link to={`/providers/${u.id}`} className="hover:underline">{u.name}</Link> : u.name}
                          </p>
                          <p className="truncate text-xs text-muted">{u.email}, {u.phone}</p>
                        </div>
                      </div>
                    </th>
                    <td className="px-4 py-3">
                      <span className="capitalize text-ink-2">{u.role}</span>
                      {u.verification && <Badge tone={VERIFY_TONE[u.verification]} className="ml-2 capitalize">{u.verification}</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.status === 'active' ? 'success' : 'danger'} className="capitalize">{u.status}</Badge>
                      {u.suspendedReason && <p className="mt-1 max-w-48 truncate text-xs text-muted" title={u.suspendedReason}>{u.suspendedReason}</p>}
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {formatDate(u.createdAt)}
                      {u.lastSeenAt && <p className="text-xs text-muted">Seen {timeAgo(u.lastSeenAt)}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">{actions(u)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Cards on phones and tablets */}
          <ul className={`grid gap-3 lg:hidden ${loading ? 'opacity-60' : ''}`}>
            {data.items.map((u) => (
              <li key={u.id} className="rounded-card border border-line bg-surface p-4">
                <div className="flex items-start gap-3">
                  <Avatar src={u.avatar} name={u.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{u.name}</p>
                    <p className="truncate text-xs text-muted">{u.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge className="capitalize">{u.role}</Badge>
                      {u.verification && <Badge tone={VERIFY_TONE[u.verification]} className="capitalize">{u.verification}</Badge>}
                      <Badge tone={u.status === 'active' ? 'success' : 'danger'} className="capitalize">{u.status}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted">Joined {formatDate(u.createdAt)}</p>
                  </div>
                </div>
                {u.role !== 'admin' && <div className="mt-3 border-t border-line pt-3">{actions(u)}</div>}
              </li>
            ))}
          </ul>
          <Pagination className="mt-6" page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}

      <Modal
        open={Boolean(suspending)}
        onClose={() => setSuspending(null)}
        title={`Suspend ${suspending?.name || ''}?`}
        description="They are signed out immediately and cannot log in. Pending offers are withdrawn."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSuspending(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={() => changeStatus(suspending, 'suspended')}>Suspend account</Button>
          </>
        }
      >
        <Field label="Reason" required error={reasonError} help="Shown to the user when they try to log in.">
          {(p) => <Textarea {...p} rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </Modal>
      <ConfirmDialog
        open={Boolean(reactivating)}
        onClose={() => setReactivating(null)}
        onConfirm={() => changeStatus(reactivating, 'active')}
        busy={busy}
        title={`Reactivate ${reactivating?.name || ''}?`}
        description="They can log in again and will be notified."
        confirmLabel="Reactivate"
      />
    </div>
  );
}
