import {
  BellIcon,
  ChatCircleDotsIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  FlagIcon,
  HandshakeIcon,
  InfoIcon,
  SealCheckIcon,
  StarIcon,
  TagIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/Button.jsx';
import { PageHeader, Pagination, Tabs } from '../components/ui/Nav.jsx';
import { CardListSkeleton, EmptyState, ErrorState } from '../components/ui/States.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { api } from '../lib/api.js';
import { formatDateTime, timeAgo } from '../lib/format.js';
import { useApi, useDocumentTitle } from '../lib/hooks.js';

const ICONS = {
  new_request: ClipboardTextIcon,
  new_offer: TagIcon,
  offer_updated: TagIcon,
  offer_withdrawn: XCircleIcon,
  offer_accepted: HandshakeIcon,
  offer_rejected: XCircleIcon,
  message: ChatCircleDotsIcon,
  request_cancelled: XCircleIcon,
  job_done: CheckCircleIcon,
  job_completed: CheckCircleIcon,
  review: StarIcon,
  verification: SealCheckIcon,
  report: FlagIcon,
};

export default function Notifications() {
  useDocumentTitle('Notifications');
  const navigate = useNavigate();
  const { markAllNotificationsRead, refreshCounts } = useRealtime();
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload, setData } = useApi('/notifications', { page, unread: tab === 'unread' ? 'true' : undefined });

  const open = async (n) => {
    if (!n.read) {
      setData((d) => ({ ...d, items: d.items.map((x) => (x.id === n.id ? { ...x, read: true } : x)), unreadCount: Math.max(0, d.unreadCount - 1) }));
      await api.post(`/notifications/${n.id}/read`).catch(() => {});
      refreshCounts();
    }
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    await markAllNotificationsRead();
    reload();
  };

  return (
    <div className="container-page max-w-3xl py-8 sm:py-10">
      <PageHeader
        title="Notifications"
        description="New offers, messages, job updates and account news."
        actions={
          data?.unreadCount > 0 ? (
            <Button variant="secondary" icon={CheckCircleIcon} onClick={readAll}>
              Mark all as read
            </Button>
          ) : null
        }
      />
      <Tabs
        className="mb-5"
        label="Filter notifications"
        value={tab}
        onChange={(v) => {
          setTab(v);
          setPage(1);
        }}
        items={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread', count: data?.unreadCount ?? undefined },
        ]}
      />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <CardListSkeleton count={5} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={BellIcon} title={tab === 'unread' ? 'Nothing unread' : 'No notifications yet'} description="We will let you know as soon as something happens." />
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {data.items.map((n) => {
              const Icon = ICONS[n.type] || InfoIcon;
              return (
                <li key={n.id}>
                  <button type="button" onClick={() => open(n)} className={`flex w-full gap-4 px-4 py-4 text-left transition-colors hover:bg-surface-2 sm:px-5 ${n.read ? '' : 'bg-accent-soft/40'}`}>
                    <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-2xl ${n.read ? 'bg-surface-3 text-muted' : 'bg-accent-soft text-accent-text'}`}>
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className={`text-[0.95rem] ${n.read ? 'text-ink-2' : 'font-bold text-ink'}`}>
                          {n.title}
                          {!n.read && <span className="sr-only"> (unread)</span>}
                        </span>
                        <time dateTime={n.createdAt} title={formatDateTime(n.createdAt)} className="shrink-0 text-xs text-muted">
                          {timeAgo(n.createdAt)}
                        </time>
                      </span>
                      {n.body && <span className="mt-0.5 block text-sm text-muted">{n.body}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Pagination className="mt-6" page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
