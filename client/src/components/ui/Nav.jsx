import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { NavLink } from 'react-router';

/** Tabs. With `to` on each item they are links (URL-driven), otherwise buttons. */
export function Tabs({ items, value, onChange, label = 'Sections', className = '' }) {
  return (
    <div className={`scrollbar-none -mx-1 overflow-x-auto px-1 ${className}`}>
      <div role="tablist" aria-label={label} className="inline-flex min-w-max gap-1 rounded-full border border-line bg-surface p-1">
        {items.map((item) => {
          const active = item.value === value;
          const cls = `inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-200 ${
            active ? 'bg-ink text-bg' : 'text-ink-2 hover:bg-surface-3 hover:text-ink'
          }`;
          const count =
            item.count !== undefined ? (
              <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? 'bg-bg/20' : 'bg-surface-3 text-muted'}`}>{item.count}</span>
            ) : null;
          if (item.to) {
            return (
              <NavLink key={item.value} to={item.to} end role="tab" aria-selected={active} className={cls}>
                {item.label}
                {count}
              </NavLink>
            );
          }
          return (
            <button key={item.value} type="button" role="tab" aria-selected={active} className={cls} onClick={() => onChange(item.value)}>
              {item.label}
              {count}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Pagination({ page, pages, onChange, className = '' }) {
  if (!pages || pages <= 1) return null;
  const nums = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i += 1) nums.push(i);
  const btn = 'inline-flex size-10 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-200';
  return (
    <nav aria-label="Pagination" className={`flex items-center justify-center gap-1 ${className}`}>
      <button type="button" className={`${btn} text-ink-2 hover:bg-surface-3 disabled:opacity-40`} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <CaretLeftIcon size={16} weight="bold" />
      </button>
      {nums[0] > 1 && <span className="px-1 text-muted">…</span>}
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-current={n === page ? 'page' : undefined}
          className={`${btn} ${n === page ? 'bg-ink text-bg' : 'text-ink-2 hover:bg-surface-3'}`}
        >
          {n}
        </button>
      ))}
      {nums[nums.length - 1] < pages && <span className="px-1 text-muted">…</span>}
      <button type="button" className={`${btn} text-ink-2 hover:bg-surface-3 disabled:opacity-40`} onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page">
        <CaretRightIcon size={16} weight="bold" />
      </button>
    </nav>
  );
}

export function PageHeader({ title, description, actions, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-bold leading-tight text-ink sm:text-[2.1rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[65ch] text-muted">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
