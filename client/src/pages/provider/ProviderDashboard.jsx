import {
  ArrowRightIcon,
  BriefcaseIcon,
  ChatCircleDotsIcon,
  CurrencyCircleDollarIcon,
  HourglassMediumIcon,
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  SealCheckIcon,
  StarIcon,
  TrophyIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { RequestCard } from '../../components/RequestCard.jsx';
import { ReviewCard } from '../../components/ReviewCard.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Card, CardHeader, Stat } from '../../components/ui/Card.jsx';
import { Toggle } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/Nav.jsx';
import { CardListSkeleton, EmptyState, ErrorState, InlineAlert, Skeleton } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocketEvent } from '../../context/RealtimeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { pkr } from '../../lib/format.js';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';

function VerificationBanner({ status, note }) {
  if (status === 'verified') return null;
  const content = {
    unverified: {
      tone: 'warning',
      title: 'Verify your identity to start sending offers',
      text: 'Upload a photo of your CNIC. Our team usually checks it within one working day.',
      cta: 'Upload CNIC',
    },
    pending: {
      tone: 'info',
      title: 'Your documents are being reviewed',
      text: 'We will notify you as soon as you are verified. Meanwhile, complete your profile so customers can see your work.',
      cta: 'Polish my profile',
    },
    rejected: {
      tone: 'danger',
      title: 'We could not verify your documents',
      text: note ? `Reason: ${note}. Please upload a clearer photo.` : 'Please upload a clearer photo of your CNIC.',
      cta: 'Upload again',
    },
  }[status];
  return (
    <div className="mb-6">
      <InlineAlert
        tone={content.tone}
        icon={IdentificationCardIcon}
        title={content.title}
        action={
          <ButtonLink to="/provider/profile#verification" size="sm" variant="secondary">
            {content.cta}
          </ButtonLink>
        }
      >
        {content.text}
      </InlineAlert>
    </div>
  );
}

export default function ProviderDashboard() {
  useDocumentTitle('Provider dashboard');
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi('/dashboard/provider');
  const [savingAvail, setSavingAvail] = useState(false);
  useSocketEvent('request:new', reload);
  useSocketEvent('request:updated', reload);

  const setAvailable = async (value) => {
    setSavingAvail(true);
    try {
      const weekly = user.provider.availability.weekly;
      const res = await api.put('/providers/me/availability', { availableNow: value, weekly });
      setUser(res.user);
      setData((d) => ({ ...d, availableNow: value }));
      toast.success(value ? 'You are shown as available now.' : 'You are shown as busy.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingAvail(false);
    }
  };

  const verification = user.provider?.verification?.status || 'unverified';

  return (
    <div className="container-page py-8 sm:py-10">
      <PageHeader
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        description="New jobs in your trade, your offers and your reputation in one place."
        actions={
          <ButtonLink to="/provider/requests" icon={MagnifyingGlassIcon}>
            Find work
          </ButtonLink>
        }
      >
        {verification === 'verified' && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-info">
            <SealCheckIcon size={18} weight="fill" aria-hidden="true" /> Verified provider
          </p>
        )}
      </PageHeader>

      <VerificationBanner status={verification} note={user.provider?.verification?.note} />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <Card className="sm:col-span-2 lg:col-span-1">
              <Toggle
                label="Available for jobs now"
                description="Customers see a green Available now badge on your profile and offers."
                checked={Boolean(data?.availableNow ?? user.provider?.availability?.availableNow)}
                onChange={setAvailable}
                disabled={savingAvail}
              />
              <Link to="/provider/availability" className="mt-3 inline-block text-sm font-semibold text-accent-text hover:underline">
                Edit weekly hours
              </Link>
            </Card>
            {loading && !data ? (
              Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-card" />)
            ) : (
              <>
                <Stat label="Pending offers" value={data.counts.pending} icon={HourglassMediumIcon} hint={`${data.counts.accepted} accepted so far`} />
                <Stat label="Win rate" value={data.winRate === null ? 'New' : `${data.winRate}%`} icon={TrophyIcon} hint="Accepted out of decided offers" />
                <Stat label="Rating" value={data.rating.count ? data.rating.avg.toFixed(1) : 'New'} icon={StarIcon} hint={`${data.rating.count} reviews, ${data.jobsCompleted} jobs`} />
              </>
            )}
          </div>

          {data && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Stat label="Earned this month" value={pkr(data.earnings.thisMonth)} icon={CurrencyCircleDollarIcon} hint="From completed jobs on LocalFix" />
              <Stat label="Earned in total" value={pkr(data.earnings.total)} icon={BriefcaseIcon} hint="Paid to you directly by customers" />
            </div>
          )}

          {data?.unreadMessages > 0 && (
            <div className="mt-6">
              <InlineAlert
                tone="accent"
                icon={ChatCircleDotsIcon}
                title={`${data.unreadMessages} unread message${data.unreadMessages === 1 ? '' : 's'} from customers`}
                action={
                  <ButtonLink to="/messages" size="sm" variant="secondary">
                    Reply now
                  </ButtonLink>
                }
              >
                Quick replies win more jobs.
              </InlineAlert>
            </div>
          )}

          <div className="mt-10 grid gap-10 xl:grid-cols-2">
            <section aria-labelledby="jobs-heading">
              <h2 id="jobs-heading" className="mb-4 text-xl font-bold text-ink">
                Jobs in progress
              </h2>
              {loading && !data ? (
                <CardListSkeleton count={2} />
              ) : data.activeJobs.length === 0 ? (
                <EmptyState icon={BriefcaseIcon} title="No active jobs" description="When a customer accepts your offer, the job appears here with their address and phone number." />
              ) : (
                <ul className="grid gap-3">
                  {data.activeJobs.map((r) => (
                    <li key={r.id}>
                      <RequestCard request={r} showStatus />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="match-heading">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="match-heading" className="text-xl font-bold text-ink">
                  New in your services
                </h2>
                <Link to="/provider/requests" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent-text hover:underline">
                  See all <ArrowRightIcon size={16} aria-hidden="true" />
                </Link>
              </div>
              {loading && !data ? (
                <CardListSkeleton count={3} />
              ) : data.matching.length === 0 ? (
                <EmptyState icon={MagnifyingGlassIcon} title="No open requests right now" description="You will get a notification the moment a matching request is posted." />
              ) : (
                <ul className="grid gap-3">
                  {data.matching.map((r) => (
                    <li key={r.id}>
                      <RequestCard request={r} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {data?.recentReviews?.length > 0 && (
            <Card className="mt-10">
              <CardHeader
                title="Latest reviews"
                action={
                  <Link to={`/providers/${user.id}#reviews`} className="text-sm font-semibold text-accent-text hover:underline">
                    View on my profile
                  </Link>
                }
              />
              <div className="divide-y divide-line">
                {data.recentReviews.map((r) => (
                  <ReviewCard key={r.id} review={r} canReply onUpdated={reload} />
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
