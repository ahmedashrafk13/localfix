import { CaretDownIcon } from '@phosphor-icons/react';
import { forwardRef, useId } from 'react';

const control =
  'block w-full rounded-field border border-line-strong bg-surface px-3.5 py-2.5 text-[0.95rem] text-ink placeholder:text-muted/80 transition-[border-color,box-shadow] duration-200 hover:border-ink/30 focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--accent-ring)] disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20';

/** Label above, control, optional help text, error below. Wires up aria-describedby automatically. */
export function Field({ label, help, error, required, children, className = '', id: givenId, optional }) {
  const autoId = useId();
  const id = givenId || autoId;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              {' '}
              *
            </span>
          )}
          {optional && <span className="font-normal text-muted"> (optional)</span>}
        </label>
      )}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required })}
      {help && !error && (
        <p id={helpId} className="text-[0.82rem] text-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[0.82rem] font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`${control} min-h-11 ${className}`} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className = '', rows = 4, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={`${control} resize-y leading-relaxed ${className}`} {...props} />;
});

export const Select = forwardRef(function Select({ className = '', children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={`${control} min-h-11 appearance-none pr-10 ${className}`} {...props}>
        {children}
      </select>
      <CaretDownIcon size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
    </div>
  );
});

export function Checkbox({ label, description, className = '', ...props }) {
  const id = useId();
  return (
    <label htmlFor={props.id || id} className={`flex cursor-pointer items-start gap-3 ${className}`}>
      <input
        id={props.id || id}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-line-strong accent-[var(--accent)]"
        {...props}
      />
      <span className="text-sm">
        <span className="font-medium text-ink">{label}</span>
        {description && <span className="block text-muted">{description}</span>}
      </span>
    </label>
  );
}

/** Accessible on/off switch. */
export function Toggle({ checked, onChange, label, description, disabled, id: givenId }) {
  const autoId = useId();
  const id = givenId || autoId;
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${checked ? 'bg-success' : 'bg-line-strong'}`}
      >
        <span className="sr-only">{label}</span>
        <span
          className={`inline-block size-5 rounded-full bg-white shadow transition-transform duration-300 ease-[var(--ease-spring)] ${checked ? 'translate-x-6' : 'translate-x-1'}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

/** Pill-style single choice (radio group), e.g. urgency or sort order. */
export function ChoiceChips({ options, value, onChange, name, legend, className = '' }) {
  return (
    <fieldset className={className}>
      {legend && <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-200 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--accent-ring)] ${
                checked ? 'border-accent bg-accent-soft text-accent-text' : 'border-line-strong bg-surface text-ink-2 hover:border-ink/30'
              }`}
            >
              <input type="radio" name={name} value={opt.value} checked={checked} onChange={() => onChange(opt.value)} className="sr-only" />
              {opt.icon}
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
