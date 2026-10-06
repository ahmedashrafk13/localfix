import { ChatCircleTextIcon, ClockIcon, MapPinIcon, NavigationArrowIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { budgetLabel, OFFER_STATUS, pkr, plural, timeAgo } from '../lib/format.js';
import { CategoryIcon } from '../lib/icons.jsx';
import { Badge, RequestStatusBadge, UrgencyBadge } from './ui/Badge.jsx';

/** Summary card for a service request. The whole card is one link target. */
export function RequestCard({ request: r, showStatus, showCustomer = true, to }) {
  const href = to || `/requests/${r.id}`;
  const thumb = r.images?.[0];
  return (
    <article className="group relative flex gap-4 rounded-card border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-soft sm:p-5">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-accent-soft sm:size-24">
        {thumb ? (
          <img src={thumb} alt="" width="96" height="96" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-accent-text">
            <CategoryIcon name={r.category?.icon} size={34} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[0.8rem] font-semibold text-accent-text">
            <CategoryIcon name={r.category?.icon} size={14} />
            {r.category?.name}
          </span>
          <UrgencyBadge urgency={r.urgency} />
          {showStatus && <RequestStatusBadge status={r.status} short />}
          {r.myOffer && (
            <Badge tone={OFFER_STATUS[r.myOffer.status]?.tone}>
              Your offer {pkr(r.myOffer.price)}
              {r.myOffer.status !== 'pending' ? `, ${OFFER_STATUS[r.myOffer.status].short.toLowerCase()}` : ''}
            </Badge>
          )}
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-[1.05rem] font-bold leading-snug text-ink">
          <Link to={href} className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:ring-4 focus-visible:after:ring-[var(--accent-ring)]">
            {r.title}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-1 text-sm text-muted sm:line-clamp-2">{r.description}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.82rem] text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPinIcon size={15} aria-hidden="true" />
            {r.location?.area}, {r.location?.city}
          </span>
          {r.distanceKm !== undefined && (
            <span className="inline-flex items-center gap-1">
              <NavigationArrowIcon size={15} aria-hidden="true" />
              {r.distanceKm} km away
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <ClockIcon size={15} aria-hidden="true" />
            {timeAgo(r.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <ChatCircleTextIcon size={15} aria-hidden="true" />
            {plural(r.offerCount, 'offer')}
            {r.lowestOffer ? `, from ${pkr(r.lowestOffer)}` : ''}
          </span>
        </div>
      </div>
      <div className="hidden shrink-0 flex-col items-end justify-between text-right md:flex">
        <span className="text-sm font-bold text-ink">{budgetLabel(r.budget)}</span>
        {showCustomer && r.customer?.name && <span className="text-xs text-muted">Posted by {r.customer.name}</span>}
      </div>
    </article>
  );
}
