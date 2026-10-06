import {
  CheckCircleIcon,
  ClipboardTextIcon,
  FlagIcon,
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  SealCheckIcon,
  StarIcon,
  TagIcon,
  UsersIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '../../components/ui/Badge.jsx';
import { Card, CardHeader, Stat } from '../../components/ui/Card.jsx';
import { PageHeader } from '../../components/ui/Nav.jsx';
import { ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { formatDate } from '../../lib/format.js';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';

/**
 * One small bar chart per measure (small multiples): the four measures have very different scales,
 * so they never share an axis. Single series each, one accent hue, hover tooltip, table alternative.
 */
function MiniBars({ title, series, total }) {
  const [hover, setHover] = useState(null);
  const W = 280;
  const H = 96;
  const gap = 2;
  const max = Math.max(1, ...series.map((d) => d.n));
  const barW = (W - gap * (series.length - 1)) / series.length;
  const active = hover !== null ? series[hover] : null;

  return (
    <figure className="rounded-card border border-line bg-surface p-4">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="text-xs text-muted">{total} in 14 days</span>
      </figcaption>
      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H + 2}`} className="block h-24 w-full" role="img" aria-label={`${title}: ${total} in the last 14 days, peak ${max} per day`} preserveAspectRatio="none">
          <line x1="0" x2={W} y1={H + 1} y2={H + 1} stroke="var(--line-strong)" strokeWidth="1" />
          {series.map((d, i) => {
            const h = d.n ? Math.max(3, (d.n / max) * (H - 4)) : 0;
            const x = i * (barW + gap);
            return (
              <g key={d.day}>
                {h >= 8 && <path d={`M${x},${H} v${-(h - 4)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${h - 4} z`} fill="var(--accent)" opacity={hover === null || hover === i ? 1 : 0.45} />}
                {h > 0 && h < 8 && <rect x={x} y={H - h} width={barW} height={h} fill="var(--accent)" opacity={hover === null || hover === i ? 1 : 0.45} />}
                <rect x={x} y="0" width={barW + gap} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              </g>
            );
          })}
        </svg>
        {active && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lift"
            style={{ left: `${((hover + 0.5) / series.length) * 100}%` }}
          >
            <span className="font-semibold text-ink tabular-nums">{active.n}</span>
            <span className="text-muted"> on {formatDate(active.day, { year: undefined })}</span>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[0.7rem] text-muted">
        <span>{formatDate(series[0].day, { year: undefined })}</span>
        <span>Today</span>
      </div>
    </figure>
  );
}

export default function Overview() {
  useDocumentTitle('Admin overview');
  const { data, loading, error, reload } = useApi('/admin/stats');
  const [showTable, setShowTable] = useState(false);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !data) {
    return (
      <div role="status" aria-label="Loading dashboard…">
        <Skeleton className="h-10 w-64" />
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
        <Skeleton className="mt-6 h-72 rounded-card" />
      </div>
    );
  }

  const t = data.totals;
  const d = data.daily;
  const sum = (s) => s.reduce((n, x) => n + x.n, 0);
  const series = [
    { key: 'requests', title: 'Requests posted', data: d.requests },
    { key: 'offers', title: 'Offers sent', data: d.offers },
    { key: 'signups', title: 'New sign-ups', data: d.signups },
    { key: 'pageViews', title: 'Page views', data: d.pageViews },
  ];
  const statusTotal = Object.values(data.requestsByStatus).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <PageHeader title="Overview" description="Live health of the marketplace, measured against the targets in our project proposal." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Customers" value={t.customers} icon={UsersIcon} />
        <Stat label="Providers" value={t.providers} icon={SealCheckIcon} hint={`${t.verifiedProviders} verified`} />
        <Stat label="Requests" value={t.requests} icon={ClipboardTextIcon} />
        <Stat label="Offers" value={t.offers} icon={TagIcon} />
        <Stat label="Reviews" value={t.reviews} icon={StarIcon} />
        <Link to="/admin/verifications" className="rounded-card transition-shadow hover:shadow-soft">
          <Stat label="Pending verifications" value={t.pendingVerifications} icon={IdentificationCardIcon} hint="Open queue" />
        </Link>
        <Link to="/admin/reports" className="rounded-card transition-shadow hover:shadow-soft">
          <Stat label="Open reports" value={t.openReports} icon={FlagIcon} hint="Open queue" />
        </Link>
        <Stat label="Suspended accounts" value={t.suspended} icon={WarningCircleIcon} />
      </div>

      <Card className="mt-6">
        <CardHeader title="Success criteria" description="Targets from section 7 of the LocalFix proposal, computed from live data." />
        <ul className="divide-y divide-line">
          {data.successCriteria.map((c) => (
            <li key={c.key} className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{c.label}</p>
                <p className="text-sm text-muted">Target: {c.target}</p>
              </div>
              <div className="flex items-center gap-3 sm:text-right">
                <span className="font-display text-lg font-bold tabular-nums text-ink">{c.display}</span>
                <Badge tone={c.met ? 'success' : 'warning'} icon={c.met ? CheckCircleIcon : WarningCircleIcon}>
                  {c.met ? 'Met' : 'Not met'}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <section aria-labelledby="activity-h" className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="activity-h" className="text-lg font-bold text-ink">
            Activity, last 14 days
          </h2>
          <button type="button" onClick={() => setShowTable((s) => !s)} className="min-h-11 text-sm font-semibold text-accent-text hover:underline" aria-expanded={showTable}>
            {showTable ? 'Hide data table' : 'Show as table'}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {series.map((s) => (
            <MiniBars key={s.key} title={s.title} series={s.data} total={sum(s.data)} />
          ))}
        </div>
        {showTable && (
          <div className="mt-4 overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <caption className="sr-only">Daily activity for the last 14 days</caption>
              <thead className="bg-surface-2 text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Day</th>
                  {series.map((s) => (
                    <th key={s.key} scope="col" className="px-4 py-2.5 text-right font-semibold">
                      {s.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line tabular-nums">
                {d.days.map((day, i) => (
                  <tr key={day}>
                    <th scope="row" className="px-4 py-2 font-medium text-ink">
                      {formatDate(day)}
                    </th>
                    {series.map((s) => (
                      <td key={s.key} className="px-4 py-2 text-right text-ink-2">
                        {s.data[i].n}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Requests by status" />
          <ul className="space-y-3">
            {[
              ['open', 'Open'],
              ['assigned', 'In progress'],
              ['completed', 'Completed'],
              ['cancelled', 'Cancelled'],
            ].map(([k, label]) => (
              <li key={k}>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">{label}</span>
                  <span className="font-semibold tabular-nums text-ink">{data.requestsByStatus[k]}</span>
                </div>
                <span className="mt-1 block h-1.5 rounded-full bg-accent" style={{ width: `${Math.max(2, (data.requestsByStatus[k] / statusTotal) * 100)}%` }} aria-hidden="true" />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Top categories" description="By number of requests" />
          <ol className="space-y-2.5 text-sm">
            {data.topCategories.map((c, i) => (
              <li key={c.slug} className="flex items-center justify-between gap-2">
                <span className="text-ink-2">
                  <span className="mr-2 inline-block w-4 text-muted tabular-nums">{i + 1}</span>
                  {c.name}
                </span>
                <span className="font-semibold tabular-nums text-ink">{c.n}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <CardHeader title="Top searches" description="Last 14 days, anonymous" />
          {data.topSearches.length === 0 ? (
            <p className="text-sm text-muted">No searches yet.</p>
          ) : (
            <ol className="space-y-2.5 text-sm">
              {data.topSearches.map((s) => (
                <li key={s.query} className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-ink-2">
                    <MagnifyingGlassIcon size={14} className="text-muted" aria-hidden="true" />
                    {s.query}
                  </span>
                  <span className="font-semibold tabular-nums text-ink">{s.n}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
      <p className="mt-6 text-xs text-muted">
        Server uptime {Math.floor(data.server.uptimeSeconds / 3600)} h {Math.floor((data.server.uptimeSeconds % 3600) / 60)} min, Node {data.server.node}.
      </p>
    </div>
  );
}
