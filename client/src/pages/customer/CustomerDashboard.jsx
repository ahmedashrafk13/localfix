import { ArrowRightIcon, ChatCircleDotsIcon, CheckCircleIcon, ClipboardTextIcon, HourglassMediumIcon, PlusIcon, StarIcon, TagIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { RequestCard } from '../../components/RequestCard.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Card, CardHeader, Stat } from '../../components/ui/Card.jsx';
import { PageHeader } from '../../components/ui/Nav.jsx';
import { CardListSkeleton, EmptyState, ErrorState, InlineAlert, Skeleton } from '../../components/ui/States.jsx';
import { useAppData } from '../../context/AppDataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocketEvent } from '../../context/RealtimeContext.jsx';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';
import { CategoryIcon } from '../../lib/icons.jsx';

function greeting() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: false }));
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function CustomerDashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const { categories } = useAppData();
  const { data, loading, error, reload } = useApi('/dashboard/customer');
  useSocketEvent('offer:new', reload);

  return (
    <div className="container-page py-8 sm:py-10">
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        description="Track your requests, compare offers and keep in touch with your providers."
        actions={
          <ButtonLink to="/post-request" icon={PlusIcon}>
            Post a request
          </ButtonLink>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {loading && !data ? (
              Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-card" />)
            ) : (
              <>
                <Stat label="Waiting for offers" value={data.counts.open} icon={ClipboardTextIcon} />
                <Stat label="Offers to review" value={data.pendingOffers} icon={TagIcon} />
                <Stat label="Jobs in progress" value={data.counts.assigned} icon={HourglassMediumIcon} />
                <Stat label="Completed jobs" value={data.counts.completed} icon={CheckCircleIcon} />
              </>
            )}
          </div>

          {data?.unreadMessages > 0 && (
            <div className="mt-6">
              <InlineAlert
                tone="accent"
                icon={ChatCircleDotsIcon}
                title={`You have ${data.unreadMessages} unread message${data.unreadMessages === 1 ? '' : 's'}`}
                action={
                  <ButtonLink to="/messages" size="sm" variant="secondary">
                    Open messages
                  </ButtonLink>
                }
              />
            </div>
          )}

          {data?.awaitingReview?.length > 0 && (
            <Card className="mt-6 border-warning/30 bg-warning-soft">
              <CardHeader title="Rate your recent jobs" description="Reviews only come from real jobs, so yours really count." />
              <ul className="grid gap-3 md:grid-cols-2">
                {data.awaitingReview.map((r) => (
                  <li key={r.id}>
                    <Link to={`/requests/${r.id}#review`} className="flex items-center gap-3 rounded-2xl bg-surface p-4 transition-shadow hover:shadow-soft">
                      <StarIcon size={24} weight="fill" className="shrink-0 text-amber-500" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink">{r.title}</span>
                        <span className="block text-sm text-muted">with {r.assignedProvider?.name}</span>
                      </span>
                      <ArrowRightIcon size={18} className="text-muted" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <section aria-labelledby="active-heading" className="mt-10">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="active-heading" className="text-xl font-bold text-ink">
                Active requests
              </h2>
              <Link to="/customer/requests" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent-text hover:underline">
                All my requests <ArrowRightIcon size={16} aria-hidden="true" />
              </Link>
            </div>
            {loading && !data ? (
              <CardListSkeleton count={3} />
            ) : data.active.length === 0 ? (
              <EmptyState
                icon={ClipboardTextIcon}
                title="No active requests"
                description="Post what needs fixing and verified providers nearby will send you offers."
                action={<ButtonLink to="/post-request">Post a request</ButtonLink>}
              />
            ) : (
              <ul className="grid gap-3">
                {data.active.map((r) => (
                  <li key={r.id}>
                    <RequestCard request={r} showStatus showCustomer={false} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="quick-heading" className="mt-12">
            <h2 id="quick-heading" className="mb-4 text-xl font-bold text-ink">
              Start a new request
            </h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/post-request?category=${c.slug}`}
                    className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent-text"
                  >
                    <CategoryIcon name={c.icon} size={20} />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
