import { CircleNotchIcon } from '@phosphor-icons/react';
import { forwardRef } from 'react';
import { Link } from 'react-router';

const base =
  'group relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-[var(--ease-spring)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55';

const variants = {
  primary: 'bg-accent text-on-accent shadow-soft hover:bg-accent-hover',
  secondary: 'border border-line-strong bg-surface text-ink hover:border-ink/30 hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink',
  soft: 'bg-accent-soft text-accent-text hover:bg-accent-soft/70',
  danger: 'bg-danger text-white hover:opacity-90 dark:text-zinc-950',
  'danger-ghost': 'text-danger hover:bg-danger-soft',
  success: 'bg-success text-white hover:opacity-90 dark:text-zinc-950',
};

const sizes = {
  sm: 'min-h-9 px-3.5 text-sm',
  md: 'min-h-11 px-5 text-[0.95rem]',
  lg: 'min-h-13 px-6 text-base',
};

function Trailing({ icon: Icon, variant }) {
  const tray = variant === 'primary' ? 'bg-on-accent/15' : 'bg-ink/5';
  return (
    <span
      className={`-mr-2.5 inline-flex size-8 items-center justify-center rounded-full ${tray} transition-transform duration-300 ease-[var(--ease-spring)] group-hover:translate-x-0.5 group-hover:-translate-y-px`}
      aria-hidden="true"
    >
      <Icon size={16} weight="bold" />
    </span>
  );
}

function classes({ variant = 'primary', size = 'md', block, className = '' }) {
  return `${base} ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`;
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', block, loading, icon: Icon, trailingIcon, children, className, type = 'button', disabled, ...props },
  ref
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={classes({ variant, size, block, className })} {...props}>
      {loading ? <CircleNotchIcon size={18} className="animate-spin" aria-hidden="true" /> : Icon ? <Icon size={18} weight="bold" aria-hidden="true" /> : null}
      {children}
      {trailingIcon && !loading && <Trailing icon={trailingIcon} variant={variant} />}
    </button>
  );
});

export function ButtonLink({ to, href, variant = 'primary', size = 'md', block, icon: Icon, trailingIcon, children, className, ...props }) {
  const cls = classes({ variant, size, block, className });
  const inner = (
    <>
      {Icon && <Icon size={18} weight="bold" aria-hidden="true" />}
      {children}
      {trailingIcon && <Trailing icon={trailingIcon} variant={variant} />}
    </>
  );
  if (href) {
    return (
      <a href={href} className={cls} {...props}>
        {inner}
      </a>
    );
  }
  return (
    <Link to={to} className={cls} {...props}>
      {inner}
    </Link>
  );
}

export const IconButton = forwardRef(function IconButton({ label, icon: Icon, size = 20, className = '', badge, weight = 'regular', ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`relative inline-flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors duration-200 hover:bg-surface-3 hover:text-ink active:scale-[0.97] ${className}`}
      {...props}
    >
      <Icon size={size} weight={weight} aria-hidden="true" />
      {badge ? (
        <span className="absolute right-1 top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-accent px-1 text-[0.68rem] font-bold leading-[1.15rem] text-on-accent ring-2 ring-surface">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  );
});
