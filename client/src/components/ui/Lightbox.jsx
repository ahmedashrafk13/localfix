import { CaretLeftIcon, CaretRightIcon, XIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Thumbnail grid that opens a full-screen, keyboard-navigable viewer. */
export function ImageGallery({ images = [], alt = 'Photo', className = '', thumbClass = 'aspect-[4/3]' }) {
  const [index, setIndex] = useState(-1);
  const close = useCallback(() => setIndex(-1), []);
  const items = images.map((img) => (typeof img === 'string' ? { url: img, caption: '' } : img));

  useEffect(() => {
    if (index < 0) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % items.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + items.length) % items.length);
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, items.length, close]);

  if (!items.length) return null;
  const current = items[index];

  return (
    <>
      <ul className={`grid gap-2 ${className}`}>
        {items.map((img, i) => (
          <li key={img.url + i}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className={`group block w-full overflow-hidden rounded-2xl bg-surface-3 ${thumbClass}`}
              aria-label={`Open ${img.caption || `${alt} ${i + 1}`} full size`}
            >
              <img
                src={img.url}
                alt={img.caption || `${alt} ${i + 1}`}
                loading="lazy"
                decoding="async"
                width="600"
                height="450"
                className="size-full object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>
      {current &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 p-4" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={close}>
            <img
              src={current.url}
              alt={current.caption || `${alt} ${index + 1}`}
              className="max-h-[85dvh] max-w-full rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {current.caption && <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900/80 px-4 py-1.5 text-sm text-white">{current.caption}</p>}
            <button type="button" onClick={close} className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Close viewer" autoFocus>
              <XIcon size={20} />
            </button>
            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex((i) => (i - 1 + items.length) % items.length);
                  }}
                  className="absolute left-4 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  aria-label="Previous photo"
                >
                  <CaretLeftIcon size={20} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex((i) => (i + 1) % items.length);
                  }}
                  className="absolute right-4 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  aria-label="Next photo"
                >
                  <CaretRightIcon size={20} />
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
