// Thin wrapper around the Fetch API. The session lives in an httpOnly cookie, so requests only need
// credentials: 'same-origin' plus the X-Requested-With header the server uses as CSRF protection.

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

const listeners = new Set();
/** Lets the auth layer react when any call reports the session has expired. */
export function onUnauthorized(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function buildUrl(path, params) {
  const url = new URL(`/api${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '' || value === false) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.pathname + url.search;
}

async function request(method, path, { body, params, signal, form } = {}) {
  const headers = { 'X-Requested-With': 'LocalFix', Accept: 'application/json' };
  let payload;
  if (form) {
    payload = form; // FormData: the browser sets the multipart boundary itself
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(buildUrl(path, params), { method, headers, body: payload, credentials: 'same-origin', signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach LocalFix right now. Check your internet connection and try again.', 0);
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    if (res.status === 401) listeners.forEach((fn) => fn());
    throw new ApiError(data?.error?.message || `Request failed (${res.status}).`, res.status, data?.error?.fields);
  }
  return data;
}

export const api = {
  get: (path, params, opts) => request('GET', path, { params, ...opts }),
  post: (path, body, opts) => request('POST', path, { body, ...opts }),
  patch: (path, body, opts) => request('PATCH', path, { body, ...opts }),
  put: (path, body, opts) => request('PUT', path, { body, ...opts }),
  del: (path, body, opts) => request('DELETE', path, { body, ...opts }),
  /** Multipart upload. `data` is sent as a JSON string next to the files. */
  upload: (path, { files = {}, data, method = 'POST' } = {}) => {
    const form = new FormData();
    if (data !== undefined) form.append('data', JSON.stringify(data));
    for (const [field, list] of Object.entries(files)) {
      for (const file of [].concat(list).filter(Boolean)) form.append(field, file);
    }
    return request(method, path, { form });
  },
};

/** Fire-and-forget anonymous analytics (page views, searches). Never throws. */
export function trackEvent(type, { path = window.location.pathname, query = '' } = {}) {
  try {
    fetch('/api/analytics/events', {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'LocalFix' },
      body: JSON.stringify({ type, path: path.slice(0, 200), query: query.slice(0, 100) }),
    }).catch(() => {});
  } catch {
    /* analytics must never break the app */
  }
}
