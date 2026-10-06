import { ArrowCounterClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Button } from './Button.jsx';

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-surface-3 ${className}`} aria-hidden="true" />;
}

/** Skeleton shaped like a request/provider card list, so the layout does not jump when data arrives. */
export function CardListSkeleton({ count = 4, className = '' }) {
  return (
    <div className={`grid gap-4 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-card border border-line bg-surface p-5">
          <div className="flex gap-4">
            <Skeleton className="size-16 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center rounded-card border border-dashed border-line-strong bg-surface px-6 py-12 text-center ${className}`}>
      {Icon && (
        <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-text">
          <Icon size={28} aria-hidden="true" />
        </span>
      )}
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className = '' }) {
  return (
    <div role="alert" className={`flex flex-col items-center rounded-card border border-line bg-surface px-6 py-10 text-center ${className}`}>
      <WarningCircleIcon size={32} className="mb-3 text-danger" aria-hidden="true" />
      <h3 className="font-bold text-ink">Something went wrong</h3>
      <p className="mt-1 max-w-md text-sm text-muted">{error?.message || 'Please try again.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" icon={ArrowCounterClockwiseIcon} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function InlineAlert({ tone = 'info', title, children, action, icon: Icon }) {
  const tones = {
    info: 'border-info/25 bg-info-soft',
    warning: 'border-warning/30 bg-warning-soft',
    danger: 'border-danger/25 bg-danger-soft',
    success: 'border-success/25 bg-success-soft',
    accent: 'border-accent/25 bg-accent-soft',
  };
  const iconTone = { info: 'text-info', warning: 'text-warning', danger: 'text-danger', success: 'text-success', accent: 'text-accent-text' };
  return (
    <div className={`flex flex-col gap-3 rounded-card border p-4 sm:flex-row sm:items-center ${tones[tone]}`} role={tone === 'danger' ? 'alert' : undefined}>
      {Icon && <Icon size={24} className={`shrink-0 ${iconTone[tone]}`} aria-hidden="true" />}
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold text-ink">{title}</p>}
        <div className="text-ink-2">{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
