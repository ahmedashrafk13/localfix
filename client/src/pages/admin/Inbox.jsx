import { ArrowCounterClockwiseIcon, CheckIcon, EnvelopeSimpleIcon, TrayIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { PageHeader, Tabs } from '../../components/ui/Nav.jsx';
import { CardListSkeleton, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatDateTime, timeAgo } from '../../lib/format.js';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';

const TOPICS = { general: 'General', account: 'Account', provider: 'Provider', safety: 'Safety', billing: 'Payments', other: 'Other' };

export default function Inbox() {
  useDocumentTitle('Support inbox');
  const toast = useToast();
  const { reloadStats } = useOutletContext() || {};
  const [status, setStatus] = useState('open');
  const { data, loading, error, reload } = useApi('/admin/inbox', { status });
  const [busy, setBusy] = useState('');

  const setMessageStatus = async (m, next) => {
    setBusy(m.id);
    try {
      await api.patch(`/admin/inbox/${m.id}`, { status: next });
      toast.success(next === 'closed' ? 'Marked as handled.' : 'Reopened.');
      reload();
      reloadStats?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <PageHeader title="Support inbox" description="Messages sent through the contact form. Reply by email, then mark them as handled." />
      <Tabs className="mb-6" label="Message status" value={status} onChange={setStatus} items={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Handled' }]} />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <CardListSkeleton count={3} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={TrayIcon} title={status === 'open' ? 'Inbox zero' : 'No handled messages'} description="New messages appear here and in your notifications." />
      ) : (
        <ul className="grid gap-3">
          {data.items.map((m) => (
            <li key={m.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink">{m.name}</p>
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your LocalFix message')}`} className="text-sm font-semibold text-accent-text hover:underline">
                    {m.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{TOPICS[m.topic] || m.topic}</Badge>
                  <span className="text-xs text-muted" title={formatDateTime(m.createdAt)}>{timeAgo(m.createdAt)}</span>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-ink-2">{m.message}</p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                <a
                  href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your LocalFix message')}`}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line-strong px-3.5 text-sm font-semibold text-ink hover:bg-surface-2"
                >
                  <EnvelopeSimpleIcon size={16} aria-hidden="true" /> Reply by email
                </a>
                {m.status === 'open' ? (
                  <Button size="sm" variant="secondary" icon={CheckIcon} loading={busy === m.id} onClick={() => setMessageStatus(m, 'closed')}>Mark handled</Button>
                ) : (
                  <Button size="sm" variant="ghost" icon={ArrowCounterClockwiseIcon} loading={busy === m.id} onClick={() => setMessageStatus(m, 'open')}>Reopen</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
