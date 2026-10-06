import { initials } from '../../lib/format.js';

const sizes = { xs: 'size-7 text-[0.65rem]', sm: 'size-9 text-xs', md: 'size-11 text-sm', lg: 'size-16 text-lg', xl: 'size-24 text-2xl' };
const px = { xs: 28, sm: 36, md: 44, lg: 64, xl: 96 };

export function Avatar({ src, name = '', size = 'md', online, className = '' }) {
  return (
    <span className={`relative inline-flex h-fit shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt=""
          width={px[size]}
          height={px[size]}
          loading="lazy"
          decoding="async"
          className={`${sizes[size]} rounded-full bg-surface-3 object-cover ring-1 ring-line`}
        />
      ) : (
        <span
          className={`${sizes[size]} inline-flex items-center justify-center rounded-full bg-accent-soft font-bold text-accent-text ring-1 ring-line`}
          aria-hidden="true"
        >
          {initials(name) || '?'}
        </span>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-surface ${online ? 'bg-success' : 'bg-line-strong'}`}
          title={online ? 'Online now' : 'Offline'}
        >
          <span className="sr-only">{online ? 'Online now' : 'Offline'}</span>
        </span>
      )}
    </span>
  );
}
