import { SealCheckIcon } from '@phosphor-icons/react';
import { OFFER_STATUS, REQUEST_STATUS, URGENCY } from '../../lib/format.js';

const tones = {
  neutral: 'bg-surface-3 text-ink-2',
  accent: 'bg-accent-soft text-accent-text',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};

export function Badge({ tone = 'neutral', icon: Icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.78rem] font-semibold leading-5 ${tones[tone]} ${className}`}>
      {Icon && <Icon size={14} weight="bold" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function RequestStatusBadge({ status, short }) {
  const s = REQUEST_STATUS[status] || REQUEST_STATUS.open;
  return <Badge tone={s.tone}>{short ? s.short : s.label}</Badge>;
}

export function OfferStatusBadge({ status }) {
  const s = OFFER_STATUS[status] || OFFER_STATUS.pending;
  return <Badge tone={s.tone}>{s.short}</Badge>;
}

export function UrgencyBadge({ urgency }) {
  const u = URGENCY[urgency] || URGENCY.today;
  return <Badge tone={u.tone}>{u.label}</Badge>;
}

export function VerifiedBadge({ compact }) {
  if (compact) {
    return (
      <span className="inline-flex text-info" title="Verified provider: ID checked by LocalFix">
        <SealCheckIcon size={18} weight="fill" aria-hidden="true" />
        <span className="sr-only">Verified provider</span>
      </span>
    );
  }
  return (
    <Badge tone="info" icon={SealCheckIcon}>
      Verified
    </Badge>
  );
}
