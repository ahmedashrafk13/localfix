// Leaflet maps (OpenStreetMap tiles). This module is lazy-loaded so the map library and its CSS
// never slow down pages that do not show a map.
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Link } from 'react-router';
import { pkr } from '../lib/format.js';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const pinIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:28px;height:28px;border-radius:50% 50% 50% 0;background:var(--accent);transform:rotate(-45deg);border:3px solid var(--surface);box-shadow:0 6px 14px rgba(0,0,0,.25)"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function Recenter({ lat, lng, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom ?? map.getZoom(), { animate: true });
  }, [lat, lng, zoom, map]);
  return null;
}

/** Shows where a job is. Non-privileged viewers get a ~1 km circle instead of the exact pin. */
export function LocationMap({ lat, lng, approximate, className = 'h-64' }) {
  return (
    <div className={`overflow-hidden rounded-card border border-line ${className}`}>
      <MapContainer center={[lat, lng]} zoom={approximate ? 13 : 15} scrollWheelZoom={false} className="size-full" attributionControl>
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        {approximate ? (
          <Circle center={[lat, lng]} radius={900} pathOptions={{ color: '#c2410c', fillColor: '#f97316', fillOpacity: 0.18, weight: 2 }} />
        ) : (
          <Marker position={[lat, lng]} icon={pinIcon} />
        )}
      </MapContainer>
    </div>
  );
}

function ClickToPlace({ onChange }) {
  useMapEvents({
    click(e) {
      onChange({ lat: Math.round(e.latlng.lat * 1e6) / 1e6, lng: Math.round(e.latlng.lng * 1e6) / 1e6 });
    },
  });
  return null;
}

/** Map where the user taps (or drags the pin) to set an exact location. */
export function LocationPicker({ value, onChange, className = 'h-72' }) {
  const handlers = useMemo(
    () => ({
      dragend(e) {
        const ll = e.target.getLatLng();
        onChange({ lat: Math.round(ll.lat * 1e6) / 1e6, lng: Math.round(ll.lng * 1e6) / 1e6 });
      },
    }),
    [onChange]
  );
  return (
    <div className={`overflow-hidden rounded-card border border-line ${className}`}>
      <MapContainer center={[value.lat, value.lng]} zoom={15} scrollWheelZoom className="size-full">
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        <Recenter lat={value.lat} lng={value.lng} />
        <ClickToPlace onChange={onChange} />
        <Marker position={[value.lat, value.lng]} icon={pinIcon} draggable eventHandlers={handlers} keyboard={false} />
      </MapContainer>
    </div>
  );
}

/** Many open requests on one map, each with a popup linking to the request. */
export function RequestsMap({ requests, center, className = 'h-[32rem]' }) {
  const start = center || (requests[0] ? { lat: requests[0].location.lat, lng: requests[0].location.lng } : { lat: 33.6938, lng: 73.0652 });
  return (
    <div className={`overflow-hidden rounded-card border border-line ${className}`}>
      <MapContainer center={[start.lat, start.lng]} zoom={11} scrollWheelZoom className="size-full">
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        {center && <Recenter lat={center.lat} lng={center.lng} zoom={12} />}
        {requests.map((r) => (
          <CircleMarker key={r.id} center={[r.location.lat, r.location.lng]} radius={10} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#c2410c', fillOpacity: 0.95 }}>
            <Popup>
              <div className="min-w-48 font-sans">
                <p className="text-xs font-semibold text-[#b13a0a]">{r.category?.name}</p>
                <p className="mt-0.5 font-bold text-zinc-900">{r.title}</p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  {r.location.area}, {r.offerCount} offer{r.offerCount === 1 ? '' : 's'}
                  {r.lowestOffer ? `, from ${pkr(r.lowestOffer)}` : ''}
                </p>
                <Link to={`/requests/${r.id}`} className="mt-1 inline-block text-sm font-semibold text-[#b13a0a]">
                  View request
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
        {center && <CircleMarker center={[center.lat, center.lng]} radius={7} pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 1 }} />}
      </MapContainer>
    </div>
  );
}
