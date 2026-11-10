import { CircleNotchIcon, MagnifyingGlassIcon, MapPinIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { useDebounce, useDismiss } from '../../lib/hooks.js';

/**
 * Type-ahead address search (ARIA combobox pattern). Results come from OpenStreetMap through
 * GET /api/geo/search, debounced so a provider's rate limit is respected.
 * `onPick(place)` receives { label, address, lat, lng, match: { city, area } | null }.
 */
export function AddressSearch({ onPick }) {
  const id = useId();
  const boxRef = useRef(null);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [message, setMessage] = useState('');
  const term = useDebounce(query.trim(), 400);

  useDismiss(boxRef, open, () => setOpen(false));

  useEffect(() => {
    if (term.length < 3) {
      setItems([]);
      setStatus('idle');
      return undefined;
    }
    const controller = new AbortController();
    setStatus('loading');
    api
      .get('/geo/search', { q: term }, { signal: controller.signal })
      .then((res) => {
        setItems(res.items);
        setActive(-1);
        setStatus('done');
        setOpen(true);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setItems([]);
        setStatus('error');
        setMessage(err.message);
        setOpen(true);
      });
    return () => controller.abort();
  }, [term]);

  const pick = (place) => {
    onPick(place);
    setQuery(place.label);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter' && open && active >= 0) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && (items.length > 0 || status === 'done' || status === 'error');

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        Search for your street or a nearby landmark <span className="font-normal text-muted">(optional)</span>
      </label>
      <div className="relative">
        <MagnifyingGlassIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          id={id}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="For example: F-10 Markaz, Saddar, Bahria Town"
          className="block min-h-11 w-full rounded-field border border-line-strong bg-surface py-2.5 pl-10 pr-10 text-[0.95rem] text-ink placeholder:text-muted/80 hover:border-ink/30 focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--accent-ring)]"
        />
        {status === 'loading' && <CircleNotchIcon size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted" aria-hidden="true" />}
      </div>
      <p className="sr-only" role="status">
        {status === 'done' ? `${items.length} place${items.length === 1 ? '' : 's'} found.` : status === 'error' ? message : ''}
      </p>
      {showList && (
        <ul id={`${id}-list`} role="listbox" aria-label="Places" className="absolute inset-x-0 top-full z-40 mt-1.5 max-h-72 overflow-auto rounded-2xl border border-line bg-surface p-1.5 shadow-lift">
          {items.map((place, i) => (
            <li
              key={place.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(place)}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-11 cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2 text-sm ${i === active ? 'bg-surface-3' : ''}`}
            >
              <MapPinIcon size={18} className="mt-0.5 shrink-0 text-accent-text" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink">{place.label}</span>
                <span className="block truncate text-xs text-muted">
                  {place.detail}
                  {place.match ? `${place.detail ? ' · ' : ''}LocalFix area: ${place.match.area}` : `${place.detail ? ' · ' : ''}Outside our service area`}
                </span>
              </span>
            </li>
          ))}
          {status === 'done' && items.length === 0 && <li className="px-3 py-3 text-sm text-muted">No places found. Choose your area below and drag the pin instead.</li>}
          {status === 'error' && <li className="px-3 py-3 text-sm text-muted">{message}</li>}
          <li className="border-t border-line px-3 pb-1 pt-2 text-[0.7rem] text-muted" aria-hidden="true">
            Search by Photon. Data © OpenStreetMap contributors
          </li>
        </ul>
      )}
    </div>
  );
}
