// Client-side storage helpers. localStorage can be unavailable (private mode, blocked storage),
// so every access is wrapped and the app keeps working without it.
// Used for: theme preference, the "Post a request" draft, recent searches and dismissed banners.

const PREFIX = 'lf.';

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* quota exceeded or storage blocked */
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },
  /** Raw string access (the theme is read as a plain string before React loads). */
  getRaw(key, fallback = null) {
    try {
      return window.localStorage.getItem(PREFIX + key) ?? fallback;
    } catch {
      return fallback;
    }
  },
  setRaw(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, value);
    } catch {
      /* ignore */
    }
  },
};

export function pushRecentSearch(term) {
  const clean = term.trim();
  if (!clean) return;
  const list = storage.get('recentSearches', []).filter((t) => t.toLowerCase() !== clean.toLowerCase());
  storage.set('recentSearches', [clean, ...list].slice(0, 5));
}
