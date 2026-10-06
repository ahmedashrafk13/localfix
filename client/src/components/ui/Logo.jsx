import { Link } from 'react-router';

export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect width="64" height="64" rx="16" fill="var(--accent)" />
      <circle cx="32" cy="27" r="11" fill="none" stroke="var(--on-accent)" strokeWidth="6" />
      <path d="M24 34 L32 49 L40 34" fill="var(--on-accent)" />
    </svg>
  );
}

export function Logo({ to = '/', className = '' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 rounded-lg ${className}`} aria-label="LocalFix home">
      <LogoMark />
      <span className="font-display text-[1.3rem] font-bold tracking-tight text-ink">
        Local<span className="text-accent-text">Fix</span>
      </span>
    </Link>
  );
}
