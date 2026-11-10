import { ArrowSquareOutIcon, CarIcon, CrosshairIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';

const SESSION_KEY = 'lf.origin';

function savedOrigin() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

/**
 * Driving time from the provider to the job (OSRM through GET /api/requests/:id/route).
 * The starting point is the provider's saved profile location, or this device's position once
 * the provider taps "Use my current location" (kept for the browser session only).
 * `onRoute(route, from)` lets the page draw the line on its map.
 */
export function TravelCard({ request, hasProfileLocation, onRoute }) {
  const [origin, setOrigin] = useState(savedOrigin);
  const [state, setState] = useState({ status: 'idle', data: null, message: '' });
  const [locating, setLocating] = useState(false);
  const canRoute = Boolean(origin || hasProfileLocation);

  useEffect(() => {
    if (!canRoute) return undefined;
    const controller = new AbortController();
    setState((s) => ({ ...s, status: 'loading' }));
    api
      .get(`/requests/${request.id}/route`, origin ? { fromLat: origin.lat, fromLng: origin.lng } : undefined, { signal: controller.signal })
      .then((data) => {
        setState({ status: 'done', data, message: '' });
        onRoute?.(data.route, data.from);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ status: 'error', data: null, message: err.message });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id, origin?.lat, origin?.lng, canRoute]);

  const locate = () => {
    if (!navigator.geolocation) {
      setState({ status: 'error', data: null, message: 'This browser cannot share your location.' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: Math.round(pos.coords.latitude * 1e5) / 1e5, lng: Math.round(pos.coords.longitude * 1e5) / 1e5 };
        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
        } catch {
          /* storage blocked: the origin just is not remembered */
        }
        setOrigin(next);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setState({ status: 'error', data: null, message: 'Could not get your location. Allow location access and try again.' });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60_000 }
    );
  };

  const { data } = state;
  const { lat, lng } = request.location;

  return (
    <Card as="section" aria-labelledby="travel-h">
      <h2 id="travel-h" className="flex items-center gap-2 font-bold text-ink">
        <CarIcon size={20} className="text-accent-text" aria-hidden="true" />
        Getting there
      </h2>
      {state.status === 'loading' && !data && <p className="mt-2 text-sm text-muted" role="status">Working out the route…</p>}
      {data && (
        <div aria-live="polite">
          <p className="mt-2 flex flex-wrap items-baseline gap-x-3">
            <span className="font-display text-3xl font-bold tabular-nums text-ink">{data.route.durationMin} min</span>
            <span className="text-sm font-semibold text-ink-2">{data.route.distanceKm} km by road</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {origin ? 'From your current location' : 'From your profile location'}
            {data.approximate ? ' to the area shown on the map. The exact address is shared when you are hired.' : ' to the customer’s address.'}
            {data.route.source === 'estimate' ? ' This is a straight-line estimate because live routing is unavailable.' : ''}
          </p>
        </div>
      )}
      {!canRoute && <p className="mt-2 text-sm text-muted">Share your location to see how far this job is and how long the drive takes.</p>}
      {state.status === 'error' && (
        <p className="mt-2 text-sm font-medium text-danger" role="alert">
          {state.message}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={CrosshairIcon} onClick={locate} loading={locating}>
          {origin ? 'Update my location' : 'Use my current location'}
        </Button>
        {!data?.approximate && data && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-accent-text hover:bg-accent-soft"
          >
            <ArrowSquareOutIcon size={16} weight="bold" aria-hidden="true" />
            Navigate in Google Maps
          </a>
        )}
      </div>
      {data?.attribution && <p className="mt-3 text-[0.7rem] text-muted">{data.attribution}</p>}
    </Card>
  );
}
