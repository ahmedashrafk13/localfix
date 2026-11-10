import {
  ArrowSquareOutIcon,
  BellRingingIcon,
  BracketsCurlyIcon,
  CloudSunIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
  PathIcon,
  SparkleIcon,
  TagIcon,
  WifiSlashIcon,
} from '@phosphor-icons/react';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';

const SERVICES = [
  { icon: MagnifyingGlassIcon, name: 'Photon', by: 'Komoot, OpenStreetMap data', use: 'Address search as you type when posting a request.', url: 'https://photon.komoot.io' },
  { icon: MapTrifoldIcon, name: 'Nominatim', by: 'OpenStreetMap', use: 'Turns your GPS position into a street address and the right LocalFix area.', url: 'https://nominatim.org' },
  { icon: PathIcon, name: 'OSRM', by: 'Open Source Routing Machine', use: 'Driving distance, travel time and the route line providers see for a job.', url: 'https://project-osrm.org' },
  { icon: CloudSunIcon, name: 'Open-Meteo', by: 'Open-Meteo.com, CC BY 4.0', use: 'Seven-day forecast at the job, with a warning when weather may delay outdoor work.', url: 'https://open-meteo.com' },
  { icon: SparkleIcon, name: 'Claude API', by: 'Anthropic', use: 'The request assistant that turns a rough description into a clear request. A built-in rule engine answers when no API key is set.', url: 'https://docs.claude.com' },
  { icon: BellRingingIcon, name: 'Web Push', by: 'W3C Push API with VAPID', use: 'Notifications for offers and messages, delivered by your browser even when LocalFix is closed.', url: 'https://www.w3.org/TR/push-api/' },
];

const BROWSER_APIS = [
  ['Service Worker and Cache API', 'Installable app that opens offline'],
  ['Push and Notifications API', 'Alerts when LocalFix is closed'],
  ['Geolocation API', 'Use my location, travel time for providers'],
  ['Web Speech API', 'Describe a problem by voice'],
  ['Web Share and Clipboard API', 'Share a request'],
  ['Fetch API and localStorage', 'All data calls, saved drafts and theme'],
  ['WebSocket (Socket.IO)', 'Live chat, typing and offers'],
];

const PRINCIPLES = [
  { icon: LightningIcon, title: 'Proxied, never called from the browser', text: 'Every outside API is called by our server. That keeps the Content-Security-Policy closed, hides nothing in client code and lets one cache serve everyone.' },
  { icon: WifiSlashIcon, title: 'A failure is a fallback, not an error', text: 'Each service has a timeout, one retry, a cache that can serve a saved answer and a circuit breaker. If routing is down you still get a distance estimate.' },
  { icon: TagIcon, title: 'Private by design', text: 'Weather lookups use coordinates rounded to about 1 km. Routes for providers who are not hired end at the public area circle, not the house.' },
];

export default function Developers() {
  useDocumentTitle('API and integrations');
  const { data: health } = useApi('/health');

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent-text">
          <BracketsCurlyIcon size={18} aria-hidden="true" />
          For developers
        </p>
        <h1 className="mt-2 text-4xl font-bold text-ink sm:text-5xl">API and integrations</h1>
        <p className="mt-4 text-lg text-ink-2">
          LocalFix is built on a documented REST API and a set of open services for maps, routing, weather, AI and push notifications. Everything on this site goes through the same API you can read here.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/api/docs" size="lg" trailingIcon={ArrowSquareOutIcon}>
            Open the API reference
          </ButtonLink>
          <ButtonLink href="/api/openapi.json" variant="secondary" size="lg">
            Download OpenAPI 3.1
          </ButtonLink>
        </div>
        {health && (
          <p className="mt-4 text-sm text-muted" role="status">
            <span className={`mr-1.5 inline-block size-2 rounded-full ${health.ok ? 'bg-success' : 'bg-danger'}`} aria-hidden="true" />
            API {health.ok ? 'is up' : 'has a problem'}, version {health.version}
          </p>
        )}
      </header>

      <section aria-labelledby="services-h" className="mt-14">
        <h2 id="services-h" className="text-2xl font-bold text-ink">
          Services we build on
        </h2>
        <ul className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <Reveal as="li" key={s.name} delay={(i % 3) * 0.05} className="flex flex-col rounded-card border border-line bg-surface p-6">
              <s.icon size={28} className="text-accent-text" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold text-ink">{s.name}</h3>
              <p className="text-sm text-muted">{s.by}</p>
              <p className="mt-2 flex-1 text-ink-2">{s.use}</p>
              <a href={s.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-accent-text hover:underline">
                Documentation
                <ArrowSquareOutIcon size={14} aria-hidden="true" />
                <span className="sr-only"> for {s.name} (opens in a new tab)</span>
              </a>
            </Reveal>
          ))}
        </ul>
      </section>

      <section aria-labelledby="principles-h" className="mt-16">
        <h2 id="principles-h" className="text-2xl font-bold text-ink">
          How the integrations are built
        </h2>
        <ul className="mt-5 grid gap-4 lg:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <li key={p.title} className="rounded-card bg-surface-2 p-6">
              <p.icon size={24} className="text-accent-text" aria-hidden="true" />
              <h3 className="mt-3 font-bold text-ink">{p.title}</h3>
              <p className="mt-1.5 text-ink-2">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-16 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="rest-h" className="rounded-card border border-line bg-surface p-6 sm:p-8">
          <h2 id="rest-h" className="text-2xl font-bold text-ink">
            The LocalFix REST API
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-2">
            <li>
              Versioned at <code className="rounded bg-surface-3 px-1.5 py-0.5 text-sm">/api/v1</code>, described in OpenAPI 3.1 and checked against the real routes by an automated test.
            </li>
            <li>JSON everywhere, one error format, page and limit on every list.</li>
            <li>Session cookie or bearer token, role checks on every route, a CSRF header on every write.</li>
            <li>Rate limits reported in RateLimit headers, and a request id on every response for tracing.</li>
            <li>Real-time events over Socket.IO for chat, offers and notifications.</li>
          </ul>
        </section>
        <section aria-labelledby="browser-h" className="rounded-card border border-line bg-surface p-6 sm:p-8">
          <h2 id="browser-h" className="text-2xl font-bold text-ink">
            Browser APIs in use
          </h2>
          <dl className="mt-4 divide-y divide-line text-sm">
            {BROWSER_APIS.map(([api, use]) => (
              <div key={api} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-6">
                <dt className="font-semibold text-ink">{api}</dt>
                <dd className="text-muted sm:text-right">{use}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <p className="mt-10 text-sm text-muted">Map data © OpenStreetMap contributors. Weather data by Open-Meteo.com. LocalFix is a CS 313 Web Engineering project.</p>
    </div>
  );
}
