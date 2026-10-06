import { ArrowSquareOutIcon, CheckIcon, EyeSlashIcon, FlagIcon, ProhibitIcon, TrashIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, Textarea } from '../../components/ui/Field.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { PageHeader, Tabs } from '../../components/ui/Nav.jsx';
import { CardListSkeleton, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatDateTime, timeAgo } from '../../lib/format.js';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';

const REASONS = {
  spam: 'Spam or advertising',
  fraud: 'Scam or payment outside LocalFix',
  abusive: 'Abusive or threatening',
  inappropriate: 'Inappropriate content',
  fake: 'Fake or misleading',
  no_show: 'Did not show up',
  other: 'Other',
};

const TYPE_LABEL = { user: 'Provider or user', request: 'Request', message: 'Chat message', review: 'Review' };

function TargetPreview({ report }) {
  const t = report.target;
  if (!t) return <p className="text-sm italic text-muted">The reported item no longer exists. ({report.targetLabel})</p>;
  return (
    <div className="rounded-2xl bg-surface-2 p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{TYPE_LABEL[report.targetType]}</p>
      {report.targetType === 'user' && (
        <p className="mt-1 font-semibold text-ink">
          {t.name} <span className="font-normal text-muted">({t.email})</span>{' '}
          <Badge tone={t.status === 'active' ? 'success' : 'danger'} className="ml-1 capitalize">{t.status}</Badge>
        </p>
      )}
      {report.targetType === 'request' && (
        <p className="mt-1 font-semibold text-ink">
          {t.title} {t.removed && <Badge tone="danger" className="ml-1">Removed</Badge>}
        </p>
      )}
      {report.targetType === 'review' && (
        <p className="mt-1 text-ink-2">
          <span className="font-semibold text-ink">{t.rating} stars:</span> {t.comment || 'No comment'} {t.hidden && <Badge className="ml-1">Hidden</Badge>}
        </p>
      )}
      {report.targetType === 'message' && (
        <p className="mt-1 text-ink-2">
          &ldquo;{t.text}&rdquo; {t.removed && <Badge tone="danger" className="ml-1">Deleted</Badge>}
        </p>
      )}
      {t.link && (
        <Link to={t.link} target="_blank" className="mt-2 inline-flex items-center gap-1 font-semibold text-accent-text hover:underline">
          Open <ArrowSquareOutIcon size={14} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export default function Reports() {
  useDocumentTitle('Reports');
  const toast = useToast();
  const { reloadStats } = useOutletContext() || {};
  const [status, setStatus] = useState('open');
  const { data, loading, error, reload } = useApi('/admin/reports', { status });
  const [closing, setClosing] = useState(null); // { report, status }
  const [note, setNote] = useState('');
  const [action, setAction] = useState(null); // { report, kind }
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = async () => {
    setBusy(true);
    try {
      await api.patch(`/admin/reports/${closing.report.id}`, { status: closing.status, resolutionNote: note.trim() });
      toast.success(closing.status === 'resolved' ? 'Report resolved. The reporter has been told.' : 'Report dismissed.');
      setClosing(null);
      setNote('');
      reload();
      reloadStats?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const moderate = async () => {
    const { report, kind } = action;
    const t = report.target;
    if ((kind === 'remove-request' || kind === 'suspend') && reason.trim().length < 3) {
      setReasonError('Give a short reason.');
      return;
    }
    setBusy(true);
    try {
      if (kind === 'remove-request') await api.del(`/admin/requests/${t.id}`, { reason: reason.trim() });
      if (kind === 'hide-review') await api.patch(`/admin/reviews/${t.id}`, { hidden: true });
      if (kind === 'delete-message') await api.del(`/admin/messages/${t.id}`);
      if (kind === 'suspend') await api.patch(`/admin/users/${t.id}/status`, { status: 'suspended', reason: reason.trim() });
      await api.patch(`/admin/reports/${report.id}`, { status: 'resolved', resolutionNote: reason.trim() || 'Content removed' });
      toast.success('Action taken and report resolved.');
      setAction(null);
      setReason('');
      reload();
      reloadStats?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const ACTIONS = {
    request: { kind: 'remove-request', label: 'Remove request', icon: TrashIcon, show: (t) => t && !t.removed },
    review: { kind: 'hide-review', label: 'Hide review', icon: EyeSlashIcon, show: (t) => t && !t.hidden },
    message: { kind: 'delete-message', label: 'Delete message', icon: TrashIcon, show: (t) => t && !t.removed },
    user: { kind: 'suspend', label: 'Suspend user', icon: ProhibitIcon, show: (t) => t && t.status === 'active' && t.role !== 'admin' },
  };

  const needsReason = action && (action.kind === 'remove-request' || action.kind === 'suspend');

  return (
    <div>
      <PageHeader title="Reports" description="Review what users flagged. Act on the content, then resolve or dismiss the report." />
      <Tabs
        className="mb-6"
        label="Report status"
        value={status}
        onChange={setStatus}
        items={[
          { value: 'open', label: 'Open' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'dismissed', label: 'Dismissed' },
        ]}
      />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <CardListSkeleton count={3} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={FlagIcon} title={status === 'open' ? 'No open reports' : 'Nothing here'} description="Reports from users appear here and in your notifications." />
      ) : (
        <ul className="grid gap-4">
          {data.items.map((r) => {
            const act = ACTIONS[r.targetType];
            return (
              <li key={r.id} className="rounded-card border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="danger" icon={FlagIcon}>{REASONS[r.reason] || r.reason}</Badge>
                      <span className="text-sm text-muted" title={formatDateTime(r.createdAt)}>{timeAgo(r.createdAt)}</span>
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-sm text-ink-2">
                      <Avatar src={r.reporter.avatar} name={r.reporter.name} size="xs" />
                      Reported by <span className="font-semibold text-ink">{r.reporter.name}</span>
                    </p>
                  </div>
                  {r.status !== 'open' && (
                    <Badge tone={r.status === 'resolved' ? 'success' : 'neutral'} className="capitalize">
                      {r.status}{r.handledBy ? ` by ${r.handledBy}` : ''}
                    </Badge>
                  )}
                </div>
                {r.details && <p className="mt-3 text-ink-2">&ldquo;{r.details}&rdquo;</p>}
                <div className="mt-4">
                  <TargetPreview report={r} />
                </div>
                {r.resolutionNote && <p className="mt-3 text-sm text-muted">Note: {r.resolutionNote}</p>}
                {r.status === 'open' && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                    {act?.show(r.target) && (
                      <Button size="sm" variant="danger" icon={act.icon} onClick={() => { setAction({ report: r, kind: act.kind }); setReasonError(''); }}>
                        {act.label}
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" icon={CheckIcon} onClick={() => setClosing({ report: r, status: 'resolved' })}>Mark resolved</Button>
                    <Button size="sm" variant="ghost" icon={XIcon} onClick={() => setClosing({ report: r, status: 'dismissed' })}>Dismiss</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={Boolean(closing)}
        onClose={() => setClosing(null)}
        title={closing?.status === 'resolved' ? 'Resolve this report?' : 'Dismiss this report?'}
        description="The reporter is notified of the outcome."
        footer={
          <>
            <Button variant="ghost" onClick={() => setClosing(null)}>Cancel</Button>
            <Button loading={busy} onClick={close}>{closing?.status === 'resolved' ? 'Resolve' : 'Dismiss'}</Button>
          </>
        }
      >
        <Field label="Internal note" optional>
          {(p) => <Textarea {...p} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      </Modal>

      <Modal
        open={Boolean(action)}
        onClose={() => setAction(null)}
        title={action ? ACTIONS[action.report.targetType].label : ''}
        description="This takes effect immediately and resolves the report."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={moderate}>Confirm</Button>
          </>
        }
      >
        {needsReason ? (
          <Field label="Reason" required error={reasonError} help="Shared with the affected user.">
            {(p) => <Input {...p} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
        ) : (
          <p className="text-sm text-ink-2">
            {action?.kind === 'hide-review' ? 'The review will be hidden from the profile and removed from the rating.' : 'The message text will be replaced with a moderation notice for both people.'}
          </p>
        )}
      </Modal>
    </div>
  );
}
