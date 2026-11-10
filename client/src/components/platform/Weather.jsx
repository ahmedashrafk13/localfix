import {
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudSunIcon,
  DropIcon,
  SunIcon,
  WarningIcon,
  WindIcon,
} from '@phosphor-icons/react';
import { useApi } from '../../lib/hooks.js';
import { Card } from '../ui/Card.jsx';
import { Skeleton } from '../ui/States.jsx';

const ICONS = {
  clear: SunIcon,
  'partly-cloudy': CloudSunIcon,
  cloudy: CloudIcon,
  fog: CloudFogIcon,
  drizzle: CloudRainIcon,
  rain: CloudRainIcon,
  snow: CloudSnowIcon,
  storm: CloudLightningIcon,
};

export function WeatherIcon({ icon, size = 22, className = '' }) {
  const Icon = ICONS[icon] || CloudIcon;
  return <Icon size={size} className={className} aria-hidden="true" />;
}

const weekday = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });
const longDay = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
const deg = (n) => (n === null || n === undefined ? '–' : `${Math.round(n)}°`);

function Advisory({ advisory }) {
  if (!advisory) return null;
  const caution = advisory.level === 'caution';
  return (
    <p
      className={`mt-3 flex items-start gap-2 rounded-2xl px-3 py-2.5 text-sm ${caution ? 'bg-warning-soft text-ink' : 'bg-surface-2 text-ink-2'}`}
      role={caution ? 'status' : undefined}
    >
      {caution && <WarningIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />}
      <span>
        {caution && <span className="font-semibold">Weather may delay this job. </span>}
        {advisory.message}
      </span>
    </p>
  );
}

/**
 * Forecast for a job location, with advice for the kind of work.
 * Data: Open-Meteo through GET /api/requests/:id/weather. Renders nothing if the forecast is unavailable:
 * weather is helpful context, never a reason to show an error on the page.
 */
export function WeatherCard({ requestId }) {
  const { data, loading, error } = useApi(`/requests/${requestId}/weather`);
  if (error) return null;
  if (loading && !data) return <Skeleton className="h-44 w-full rounded-card" />;
  if (!data?.days?.length) return null;
  const focus = data.focus || data.days[0];
  const isToday = focus.date === data.days[0].date;

  return (
    <Card as="section" aria-labelledby="weather-h">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="weather-h" className="font-bold text-ink">
            Weather at the job
          </h2>
          <p className="text-sm text-muted">
            {data.focusIsPreferredDate ? `Preferred date, ${longDay(focus.date)}` : isToday ? 'Today' : longDay(focus.date)}
          </p>
        </div>
        <WeatherIcon icon={focus.icon} size={36} className="shrink-0 text-accent-text" />
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-3xl font-bold tabular-nums text-ink">{deg(focus.maxC)}</span>
        <span className="text-sm text-muted">low {deg(focus.minC)}</span>
        <span className="text-sm font-semibold text-ink-2">{focus.label}</span>
      </p>
      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1">
          <DropIcon size={15} aria-hidden="true" />
          {focus.rainChance ?? 0}% chance of rain
        </span>
        <span className="inline-flex items-center gap-1">
          <WindIcon size={15} aria-hidden="true" />
          {Math.round(focus.windKph ?? 0)} km/h wind
        </span>
      </p>
      <Advisory advisory={data.advisory} />
      <ul className="mt-4 grid grid-cols-5 gap-1 border-t border-line pt-3" aria-label="Forecast for the next days">
        {data.days.slice(0, 5).map((d) => (
          <li key={d.date} className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-center ${d.date === focus.date ? 'bg-surface-3' : ''}`}>
            <span className="text-xs font-semibold text-ink-2">{weekday(d.date)}</span>
            <WeatherIcon icon={d.icon} size={20} className="text-ink-2" />
            <span className="sr-only">{d.label},</span>
            <span className="text-xs tabular-nums text-ink">{deg(d.maxC)}</span>
            <span className="text-[0.7rem] tabular-nums text-muted">
              {d.rainChance ?? 0}%<span className="sr-only"> chance of rain</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.7rem] text-muted">
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline">
          Weather data by Open-Meteo.com
        </a>
        {data.stale ? ' (saved copy, the live forecast is unavailable)' : ''}
      </p>
    </Card>
  );
}

/** One-line forecast for the chosen date while posting a request. */
export function WeatherHint({ lat, lng, date, categorySlug }) {
  const enabled = lat !== null && lng !== null && Boolean(date);
  const { data } = useApi('/geo/weather', { lat, lng, date, category: categorySlug }, { enabled });
  if (!enabled || !data?.focus) return null;
  const caution = data.advisory?.level === 'caution';
  return (
    <p className={`flex items-start gap-2 rounded-2xl px-3 py-2.5 text-sm ${caution ? 'bg-warning-soft text-ink' : 'bg-surface-2 text-ink-2'}`} role="status">
      <WeatherIcon icon={data.focus.icon} size={20} className={`mt-0.5 shrink-0 ${caution ? 'text-warning' : 'text-ink-2'}`} />
      <span>
        <span className="font-semibold text-ink">
          Forecast for {longDay(data.focus.date)}: {data.focus.label.toLowerCase()}, {deg(data.focus.maxC)}, {data.focus.rainChance ?? 0}% chance of rain.
        </span>{' '}
        {data.advisory?.level !== 'ok' ? data.advisory?.message : ''}
      </span>
    </p>
  );
}
