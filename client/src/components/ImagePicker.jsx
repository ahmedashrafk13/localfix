import { CameraIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/** Lets users add up to `max` photos with previews. Validates type and size before upload. */
export function ImagePicker({ files, onChange, max = 5, label = 'Add photos', help, error: externalError }) {
  const inputId = useId();
  const input = useRef(null);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const add = (list) => {
    setError('');
    const next = [...files];
    for (const f of list) {
      if (!ACCEPT.includes(f.type)) {
        setError(`"${f.name}" is not a JPG, PNG or WebP image.`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        setError(`"${f.name}" is larger than 5 MB.`);
        continue;
      }
      if (next.length >= max) {
        setError(`You can add up to ${max} photos.`);
        break;
      }
      next.push(f);
    }
    onChange(next);
  };

  const shownError = error || externalError;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {previews.map((url, i) => (
          <div key={url} className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-surface-3">
            <img src={url} alt={`Selected photo ${i + 1}`} width="160" height="160" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="absolute right-1.5 top-1.5 inline-flex size-8 items-center justify-center rounded-full bg-zinc-950/70 text-white hover:bg-zinc-950"
              aria-label={`Remove photo ${i + 1}`}
            >
              <XIcon size={14} weight="bold" />
            </button>
          </div>
        ))}
        {files.length < max && (
          <label
            htmlFor={inputId}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              add([...e.dataTransfer.files]);
            }}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line-strong bg-surface-2 text-center text-xs font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent-text has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--accent-ring)]"
          >
            <CameraIcon size={24} aria-hidden="true" />
            {label}
            <input
              ref={input}
              id={inputId}
              type="file"
              accept={ACCEPT.join(',')}
              multiple={max > 1}
              className="sr-only"
              onChange={(e) => {
                add([...e.target.files]);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
      <p className="mt-2 text-[0.82rem] text-muted">{help || `JPG, PNG or WebP, up to 5 MB each. ${files.length}/${max} added.`}</p>
      {shownError && (
        <p className="mt-1 text-[0.82rem] font-medium text-danger" role="alert">
          {shownError}
        </p>
      )}
    </div>
  );
}
