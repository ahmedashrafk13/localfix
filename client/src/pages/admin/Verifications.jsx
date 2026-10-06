import { ArrowSquareOutIcon, CheckIcon, IdentificationCardIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Textarea } from '../../components/ui/Field.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { PageHeader, Tabs } from '../../components/ui/Nav.jsx';
import { CardListSkeleton, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatDate, formatDateTime } from '../../lib/format.js';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';
import { CategoryIcon } from '../../lib/icons.jsx';

export default function Verifications() {
  useDocumentTitle('Provider verifications');
  const toast = useToast();
  const { reloadStats } = useOutletContext() || {};
  const [status, setStatus] = useState('pending');
  const { data, loading, error, reload } = useApi('/admin/verifications', { status });
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [busyId, setBusyId] = useState('');

  const decide = async (p, decision) => {
    if (decision === 'rejected' && note.trim().length < 3) {
      setNoteError('Tell the provider what to fix.');
      return;
    }
    setBusyId(p.id);
    try {
      await api.post(`/admin/verifications/${p.id}`, { decision, note: decision === 'rejected' ? note.trim() : '' });
      toast.success(decision === 'verified' ? `${p.name} is now verified.` : `${p.name} has been asked to resubmit.`);
      setRejecting(null);
      setNote('');
      reload();
      reloadStats?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div>
      <PageHeader title="Provider verifications" description="Check each CNIC against the provider's name before approving. Only admins can see these documents." />
      <Tabs
        className="mb-6"
        label="Verification status"
        value={status}
        onChange={setStatus}
        items={[
          { value: 'pending', label: 'Pending' },
          { value: 'verified', label: 'Verified' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'unverified', label: 'Not submitted' },
        ]}
      />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <CardListSkeleton count={3} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={IdentificationCardIcon} title="Nothing in this queue" description={status === 'pending' ? 'All caught up. New submissions appear here and in your notifications.' : 'No providers with this status.'} />
      ) : (
        <ul className="grid gap-4">
          {data.items.map((p) => (
            <li key={p.id} className="rounded-card border border-line bg-surface p-5">
              <div className="grid gap-5 md:grid-cols-[1fr_18rem]">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <Avatar src={p.avatar} name={p.name} size="lg" />
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-ink">
                        <Link to={`/providers/${p.id}`} className="hover:underline">{p.name}</Link>
                      </p>
                      <p className="truncate text-sm text-muted">{p.email}, {p.phone}</p>
                      <p className="text-sm text-muted">{p.area ? `${p.area}, ` : ''}{p.city}. Joined {formatDate(p.createdAt)}</p>
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted">Services</dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {p.categories.length ? p.categories.map((c) => (
                          <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-ink-2">
                            <CategoryIcon name={c.icon} size={12} />{c.name}
                          </span>
                        )) : <span className="text-ink-2">None chosen</span>}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Experience</dt>
                      <dd className="font-semibold text-ink">{p.experienceYears} years</dd>
                    </div>
                    <div>
                      <dt className="text-muted">CNIC ending</dt>
                      <dd className="font-semibold text-ink">{p.verification.idLast4 || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Submitted</dt>
                      <dd className="font-semibold text-ink">{p.verification.submittedAt ? formatDateTime(p.verification.submittedAt) : 'Not yet'}</dd>
                    </div>
                    {p.serviceAreas.length > 0 && (
                      <div className="sm:col-span-2">
                        <dt className="text-muted">Areas</dt>
                        <dd className="text-ink-2">{p.serviceAreas.join(', ')}</dd>
                      </div>
                    )}
                    {p.verification.note && (
                      <div className="sm:col-span-2">
                        <dt className="text-muted">Last note</dt>
                        <dd className="text-ink-2">{p.verification.note}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                <div>
                  {p.hasDocument ? (
                    <a href={`/api/admin/verifications/${p.id}/document`} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-2xl border border-line bg-surface-3">
                      <img src={`/api/admin/verifications/${p.id}/document`} alt={`ID document uploaded by ${p.name}`} width="288" height="180" loading="lazy" className="aspect-[16/10] w-full object-contain" />
                      <span className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-accent-text group-hover:underline">
                        Open full size <ArrowSquareOutIcon size={14} aria-hidden="true" />
                      </span>
                    </a>
                  ) : (
                    <div className="flex aspect-[16/10] items-center justify-center rounded-2xl border border-dashed border-line-strong text-sm text-muted">No document uploaded</div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.verification.status !== 'verified' && p.hasDocument && (
                      <Button size="sm" variant="success" icon={CheckIcon} loading={busyId === p.id} onClick={() => decide(p, 'verified')}>Approve</Button>
                    )}
                    {p.verification.status !== 'rejected' && p.hasDocument && (
                      <Button size="sm" variant="danger-ghost" icon={XIcon} onClick={() => { setRejecting(p); setNoteError(''); }}>Reject</Button>
                    )}
                    {p.verification.status === 'verified' && <Badge tone="info">Verified {p.verification.reviewedAt ? formatDate(p.verification.reviewedAt) : ''}</Badge>}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title={`Reject ${rejecting?.name || ''}'s documents?`}
        description="The provider is notified with your note and can upload new documents."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="danger" loading={busyId === rejecting?.id} onClick={() => decide(rejecting, 'rejected')}>Reject</Button>
          </>
        }
      >
        <Field label="What needs fixing?" required error={noteError} help="For example: the photo is blurry, or the name does not match the account.">
          {(p) => <Textarea {...p} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      </Modal>
    </div>
  );
}
