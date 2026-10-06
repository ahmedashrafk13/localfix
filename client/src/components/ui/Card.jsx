export function Card({ as: Tag = 'div', className = '', padded = true, children, ...props }) {
  return (
    <Tag className={`rounded-card border border-line bg-surface ${padded ? 'p-5 sm:p-6' : ''} ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, action, as: H = 'h2' }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <H className="text-lg font-bold text-ink">{title}</H>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Stat tile for dashboards. */
export function Stat({ label, value, hint, icon: Icon }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted">{label}</p>
        {Icon && <Icon size={20} className="text-muted" aria-hidden="true" />}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-ink sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-[0.82rem] text-muted">{hint}</p>}
    </div>
  );
}
