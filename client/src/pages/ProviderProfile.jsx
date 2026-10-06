import {
  ArrowLeftIcon,
  BriefcaseIcon,
  CalendarCheckIcon,
  CertificateIcon,
  ClockIcon,
  MapPinIcon,
  PencilSimpleIcon,
  StarIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ReportButton } from '../components/ReportDialog.jsx';
import { ReviewCard } from '../components/ReviewCard.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Badge, VerifiedBadge } from '../components/ui/Badge.jsx';
import { ButtonLink } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { ImageGallery } from '../components/ui/Lightbox.jsx';
import { Pagination } from '../components/ui/Nav.jsx';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States.jsx';
import { Stars } from '../components/ui/Stars.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { DAYS, isWithinHours, memberSince, pkr, timeAgo } from '../lib/format.js';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { CategoryIcon } from '../lib/icons.jsx';

function RatingBreakdown({ breakdown, total }) {
  return (
    <ul className="space-y-1.5" aria-label="Rating breakdown">
      {[5, 4, 3, 2, 1].map((n) => {
        const count = breakdown?.[n] || 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        return (
          <li key={n} className="flex items-center gap-2 text-sm">
            <span className="w-12 shrink-0 text-ink-2">
              {n} star{n > 1 ? 's' : ''}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
              <span className="block h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
            </span>
            <span className="w-14 shrink-0 text-right tabular-nums text-muted">
              {count} <span className="sr-only">reviews</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Shows the 6 newest reviews from the profile response, then pages through all of them on request. */
function Reviews({ providerId, initial, total, canReply }) {
  const [page, setPage] = useState(0); // 0 = preview from the profile response
  const [local, setLocal] = useState(initial);
  const { data, loading, reload } = useApi(`/providers/${providerId}/reviews`, { page }, { enabled: page > 0 });
  const items = page === 0 ? local : data?.items || [];
  const pages = Math.max(1, Math.ceil(total / 10));
  if (!total) {
    return <EmptyState icon={StarIcon} title="No reviews yet" description="Reviews appear here after customers complete a job with this provider." />;
  }
  const onUpdated = (updated) => {
    if (page === 0) setLocal((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    else reload();
  };
  return (
    <>
      <div className={`divide-y divide-line ${loading ? 'opacity-60' : ''}`}>
        {items.map((r) => (
          <ReviewCard key={r.id} review={r} canReply={canReply} canReport={!canReply} onUpdated={onUpdated} />
        ))}
      </div>
      {page === 0 ? (
        total > initial.length && (
          <button type="button" onClick={() => setPage(1)} className="mt-5 min-h-11 text-sm font-semibold text-accent-text hover:underline">
            Show all {total} reviews
          </button>
        )
      ) : (
        <Pagination className="mt-6" page={page} pages={pages} onChange={setPage} />
      )}
    </>
  );
}

export default function ProviderProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(`/providers/${id}`);
  const p = data?.provider;
  useDocumentTitle(p ? `${p.name}, ${p.headline || 'provider'}` : 'Provider');

  if (loading && !data) {
    return (
      <div className="container-page py-8" role="status" aria-label="Loading profile…">
        <div className="flex items-center gap-5">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <Skeleton className="mt-8 h-96 w-full rounded-card" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="container-page py-12">
        {error.status === 404 ? (
          <EmptyState icon={WarningIcon} title="Provider not found" description="This profile is not available." action={<ButtonLink to="/providers">Browse providers</ButtonLink>} />
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )}
      </div>
    );
  }
  if (!p) return null;

  const isSelf = user?.id === p.id;
  const inHours = isWithinHours(p.availability.weekly);
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })).getDay();

  return (
    <div className="container-page py-6 sm:py-8">
      <Link to="/providers" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeftIcon size={16} aria-hidden="true" /> All providers
      </Link>

      {isSelf && !p.verified && (
        <div className="mb-4 rounded-card border border-warning/30 bg-warning-soft p-4 text-sm text-ink-2">
          Only you and admins can see this profile until you are verified.{' '}
          <Link to="/provider/profile#verification" className="font-semibold text-accent-text underline">
            Complete verification
          </Link>
        </div>
      )}

      <header className="mt-2 flex flex-col gap-6 rounded-[1.75rem] border border-line bg-surface p-6 sm:p-8 md:flex-row md:items-center">
        <Avatar src={p.avatar} name={p.name} size="xl" online={p.online} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-ink">{p.name}</h1>
            {p.verified && <VerifiedBadge />}
            {p.availableNow && <Badge tone="success">Available now</Badge>}
          </div>
          {p.headline && <p className="mt-1 text-lg text-ink-2">{p.headline}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <Stars value={p.ratingAvg} showValue count={p.ratingCount} />
            <span className="inline-flex items-center gap-1">
              <BriefcaseIcon size={16} aria-hidden="true" />
              {p.jobsCompleted} jobs completed
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPinIcon size={16} aria-hidden="true" />
              {p.area ? `${p.area}, ` : ''}
              {p.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarCheckIcon size={16} aria-hidden="true" />
              Member since {memberSince(p.memberSince)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
          {isSelf ? (
            <ButtonLink to="/provider/profile" icon={PencilSimpleIcon}>
              Edit profile
            </ButtonLink>
          ) : (
            (!user || user.role === 'customer') && <ButtonLink to={`/post-request?category=${p.categories[0]?.slug || ''}`}>Request a quote</ButtonLink>
          )}
          {!isSelf && <ReportButton targetType="user" targetId={p.id} label="Report provider" />}
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-8">
          <Card>
            <CardHeader title="About" />
            {p.bio ? <p className="whitespace-pre-line leading-relaxed text-ink-2">{p.bio}</p> : <p className="text-muted">This provider has not written a bio yet.</p>}
            <h3 className="mt-6 text-sm font-bold text-ink">Services</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {p.categories.map((c) => (
                <li key={c.id}>
                  <Link to={`/providers?category=${c.slug}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-sm font-semibold text-accent-text hover:underline">
                    <CategoryIcon name={c.icon} size={16} />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            {p.serviceAreas.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-bold text-ink">Works in</h3>
                <p className="mt-1 text-sm text-ink-2">{p.serviceAreas.join(', ')}</p>
              </>
            )}
          </Card>

          {p.gallery.length > 0 && (
            <Card>
              <CardHeader title="Recent work" description={`${p.gallery.length} photo${p.gallery.length === 1 ? '' : 's'} uploaded by ${p.name.split(' ')[0]}`} />
              <ImageGallery images={p.gallery} alt="Work photo" className="grid-cols-2 sm:grid-cols-3" />
            </Card>
          )}

          <Card id="reviews">
            <CardHeader title="Reviews" description="Only customers who completed a job can leave a review." />
            {p.ratingCount > 0 && (
              <div className="mb-6 grid gap-6 rounded-2xl bg-surface-2 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="text-center sm:pr-6">
                  <p className="font-display text-5xl font-bold text-ink">{p.ratingAvg.toFixed(1)}</p>
                  <Stars value={p.ratingAvg} size={16} />
                  <p className="mt-1 text-sm text-muted">{p.ratingCount} reviews</p>
                </div>
                <RatingBreakdown breakdown={data.ratingBreakdown} total={p.ratingCount} />
              </div>
            )}
            <Reviews providerId={p.id} initial={data.reviews} total={p.ratingCount} canReply={isSelf} />
          </Card>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <Card>
            <h2 className="font-bold text-ink">At a glance</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted">Experience</dt>
                <dd className="font-display text-2xl font-bold text-ink">{p.experienceYears} yrs</dd>
              </div>
              <div>
                <dt className="text-muted">Jobs done</dt>
                <dd className="font-display text-2xl font-bold text-ink">{p.jobsCompleted}</dd>
              </div>
              <div>
                <dt className="text-muted">Starting price</dt>
                <dd className="font-semibold text-ink">{p.startingPrice ? pkr(p.startingPrice) : 'Quote per job'}</dd>
              </div>
              <div>
                <dt className="text-muted">Last active</dt>
                <dd className="font-semibold text-ink">{p.online ? 'Online now' : p.lastSeenAt ? timeAgo(p.lastSeenAt) : 'Recently'}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="flex items-center justify-between gap-2 font-bold text-ink">
              <span className="inline-flex items-center gap-2">
                <ClockIcon size={20} aria-hidden="true" />
                Working hours
              </span>
              <Badge tone={inHours ? 'success' : 'neutral'}>{inHours ? 'Open now' : 'Closed now'}</Badge>
            </h2>
            <ul className="mt-3 space-y-1 text-sm">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const day = p.availability.weekly.find((w) => w.day === d);
                return (
                  <li key={d} className={`flex justify-between rounded-lg px-2 py-1 ${d === today ? 'bg-surface-3 font-semibold text-ink' : 'text-ink-2'}`}>
                    <span>
                      {DAYS[d]}
                      {d === today && <span className="sr-only"> (today)</span>}
                    </span>
                    <span>{day?.enabled ? `${day.from} to ${day.to}` : 'Closed'}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {p.certifications.length > 0 && (
            <Card>
              <h2 className="flex items-center gap-2 font-bold text-ink">
                <CertificateIcon size={20} aria-hidden="true" />
                Certifications
              </h2>
              <ul className="mt-3 space-y-3">
                {p.certifications.map((c) => (
                  <li key={c.id} className="text-sm">
                    <p className="font-semibold text-ink">{c.title}</p>
                    <p className="text-muted">
                      {c.issuer}
                      {c.year ? `, ${c.year}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
