import { ClockCounterClockwiseIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppData } from '../../context/AppDataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { matchCategories } from '../../lib/fuzzy.js';
import { useDismiss } from '../../lib/hooks.js';
import { CategoryIcon } from '../../lib/icons.jsx';
import { pushRecentSearch, storage } from '../../lib/storage.js';

/**
 * Persistent header search. Customers and guests search providers; providers search open requests.
 * Category suggestions are typo-tolerant, and recent searches are kept in localStorage.
 */
export function HeaderSearch({ className = '', onDone, autoFocus }) {
  const { user } = useAuth();
  const { categories } = useAppData();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrap = useRef(null);
  const listId = useId();
  useDismiss(wrap, open, () => setOpen(false));

  const forWork = user?.role === 'provider';
  const target = forWork ? '/provider/requests' : '/providers';
  const placeholder = forWork ? 'Search open requests…' : 'What needs fixing?';

  const suggestions = useMemo(() => {
    const cats = q.trim() ? matchCategories(q, categories) : categories.slice(0, 5);
    const items = cats.map((c) => ({ type: 'category', key: c.slug, label: c.name, category: c }));
    if (!q.trim()) {
      for (const term of storage.get('recentSearches', [])) items.unshift({ type: 'recent', key: `r-${term}`, label: term });
    } else {
      items.push({ type: 'query', key: 'query', label: `Search for "${q.trim()}"` });
    }
    return items.slice(0, 8);
  }, [q, categories]);

  const go = (item) => {
    setOpen(false);
    setActive(-1);
    if (!item) return;
    if (item.type === 'category') navigate(`${target}?category=${item.category.slug}`);
    else {
      const term = item.type === 'recent' ? item.label : q.trim();
      if (!term) return;
      pushRecentSearch(term);
      navigate(`${target}?q=${encodeURIComponent(term)}`);
    }
    setQ('');
    onDone?.();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(suggestions.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (active >= 0 && suggestions[active]) return go(suggestions[active]);
    const exact = matchCategories(q, categories, 1)[0];
    if (exact && exact.name.toLowerCase() === q.trim().toLowerCase()) return go({ type: 'category', category: exact });
    return go({ type: 'query' });
  };

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <form role="search" onSubmit={onSubmit}>
        <label htmlFor={`${listId}-input`} className="sr-only">
          {placeholder}
        </label>
        <MagnifyingGlassIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          id={`${listId}-input`}
          type="search"
          value={q}
          autoFocus={autoFocus}
          autoComplete="off"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className="h-11 w-full rounded-full border border-line bg-surface-2 pl-10 pr-4 text-[0.95rem] text-ink placeholder:text-muted transition-[border-color,box-shadow] duration-200 hover:border-line-strong focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-[var(--accent-ring)]"
        />
      </form>
      {open && suggestions.length > 0 && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-lift">
          {suggestions.map((s, i) => (
            <li
              key={s.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                go(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${i === active ? 'bg-surface-3 text-ink' : 'text-ink-2'}`}
            >
              {s.type === 'category' ? (
                <CategoryIcon name={s.category.icon} size={18} className="text-accent-text" />
              ) : s.type === 'recent' ? (
                <ClockCounterClockwiseIcon size={18} className="text-muted" aria-hidden="true" />
              ) : (
                <MagnifyingGlassIcon size={18} className="text-muted" aria-hidden="true" />
              )}
              <span className="truncate">{s.label}</span>
              {s.type === 'category' && <span className="ml-auto text-xs text-muted">{forWork ? `${s.category.openRequests} open` : `${s.category.providers} pros`}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
