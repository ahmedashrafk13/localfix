import { StarIcon } from '@phosphor-icons/react';
import { useState } from 'react';

/** Read-only rating with an accessible text equivalent. */
export function Stars({ value = 0, size = 16, showValue, count, className = '' }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="inline-flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <StarIcon
            key={n}
            size={size}
            weight={rounded >= n ? 'fill' : rounded >= n - 0.5 ? 'duotone' : 'regular'}
            className={rounded >= n - 0.5 ? 'text-amber-500' : 'text-line-strong'}
          />
        ))}
      </span>
      <span className="sr-only">{value ? `Rated ${value.toFixed(1)} out of 5` : 'No ratings yet'}</span>
      {showValue && (
        <span className="text-sm font-semibold text-ink tabular-nums" aria-hidden="true">
          {value ? value.toFixed(1) : 'New'}
        </span>
      )}
      {count !== undefined && <span className="text-sm text-muted">({count})</span>}
    </span>
  );
}

const LABELS = ['', 'Poor', 'Below expectations', 'Okay', 'Good', 'Excellent'];

/** Keyboard-accessible star input (radio group). */
export function StarInput({ value, onChange, name = 'rating' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset>
      <legend className="sr-only">Rating</legend>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer rounded-lg p-1 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--accent-ring)]" onMouseEnter={() => setHover(n)}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" />
            <StarIcon size={34} weight={shown >= n ? 'fill' : 'regular'} className={shown >= n ? 'text-amber-500' : 'text-line-strong'} aria-hidden="true" />
            <span className="sr-only">
              {n} star{n > 1 ? 's' : ''}, {LABELS[n]}
            </span>
          </label>
        ))}
        <span className="ml-2 text-sm font-semibold text-ink-2" aria-live="polite">
          {LABELS[shown]}
        </span>
      </div>
    </fieldset>
  );
}
