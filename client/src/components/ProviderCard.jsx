import { BriefcaseIcon, MapPinIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { pkr } from '../lib/format.js';
import { CategoryIcon } from '../lib/icons.jsx';
import { Avatar } from './ui/Avatar.jsx';
import { VerifiedBadge } from './ui/Badge.jsx';
import { Stars } from './ui/Stars.jsx';

export function ProviderCard({ provider: p }) {
  return (
    <article className="group relative flex h-full flex-col rounded-card border border-line bg-surface p-5 transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-soft">
      <div className="flex items-start gap-4">
        <Avatar src={p.avatar} name={p.name} size="lg" online={p.online} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-start gap-1.5 text-[1.05rem] font-bold leading-snug text-ink">
            <Link to={`/providers/${p.id}`} className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:ring-4 focus-visible:after:ring-[var(--accent-ring)]">
              {p.name}
            </Link>
            {p.verified && <VerifiedBadge compact />}
          </h3>
          <Stars value={p.ratingAvg} showValue count={p.ratingCount} size={14} className="mt-0.5" />
          {p.availableNow && <span className="mt-1 inline-flex rounded-full bg-success-soft px-2 py-0.5 text-[0.7rem] font-bold text-success">Available now</span>}
          <p className="mt-1 flex items-center gap-1 text-[0.82rem] text-muted">
            <MapPinIcon size={14} aria-hidden="true" />
            {p.area ? `${p.area}, ` : ''}
            {p.city}
          </p>
        </div>
      </div>
      {p.headline && <p className="mt-4 line-clamp-2 text-sm text-ink-2">{p.headline}</p>}
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Services">
        {p.categories?.slice(0, 3).map((c) => (
          <li key={c.id} className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-1 text-xs font-medium text-ink-2">
            <CategoryIcon name={c.icon} size={13} />
            {c.name}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4 text-[0.82rem]">
        <span className="inline-flex items-center gap-1 text-muted">
          <BriefcaseIcon size={15} aria-hidden="true" />
          {p.jobsCompleted} jobs, {p.experienceYears} yrs exp.
        </span>
        {p.startingPrice ? <span className="font-semibold text-ink">From {pkr(p.startingPrice)}</span> : null}
      </div>
    </article>
  );
}
