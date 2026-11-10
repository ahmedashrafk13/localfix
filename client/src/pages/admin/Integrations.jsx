import { ArrowsClockwiseIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardHeader, Stat } from '../../components/ui/Card.jsx';
import { PageHeader } from '../../components/ui/Nav.jsx';
import { ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { timeAgo } from '../../lib/format.js';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';

const BREAKER = {
  closed: { tone: 'success', label: 'Healthy' },
  'half-open': { tone: 'warning', label: 'Recovering' },
  open: { tone: 'danger', label: 'Paused after failures' },
};

const ms = (n) => (n === null || n === undefined ? '–' : `${Math.round(n)} ms`);

/** Live status of every third-party service the platform depends on (GET /api/admin/integrations). */
export default function Integrations() {
  useDocumentTitle('Integrations');
  const { data, loading, error, reload } = useApi('/admin/integrations');

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !data) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading integrations">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  const totalCalls = data.upstreams.reduce((sum, u) => sum + u.calls, 0);
  const totalHits = data.upstreams.reduce((sum, u) => sum + u.cacheHits, 0);
  const failures = data.upstreams.reduce((sum, u) => sum + u.failures, 0);

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Third-party APIs behind maps, routing, weather, the request assistant and push notifications. Counters start at zero when the server restarts."
        actions={
          <Button variant="secondary" size="sm" icon={ArrowsClockwiseIcon} onClick={reload} loading={loading}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Calls to outside APIs" value={totalCalls} hint="Since the server started" />
        <Stat label="Answered from cache" value={totalHits} hint={totalCalls + totalHits ? `${Math.round((totalHits / (totalCalls + totalHits)) * 100)}% of lookups made no outside call` : 'No lookups yet'} />
        <Stat label="Failed calls" value={failures} hint={failures ? 'Users saw a fallback, not an error' : 'Nothing has failed'} />
        <Stat label="Push devices" value={data.push.devices} hint={`${data.push.users} user${data.push.users === 1 ? '' : 's'} subscribed`} />
      </div>

      {!data.externalApisEnabled && (
        <p className="mt-4 rounded-card border border-warning/30 bg-warning-soft p-4 text-sm text-ink" role="status">
          Outside API calls are switched off on this server (EXTERNAL_APIS=false). Maps search, routing and weather use their fallbacks.
        </p>
      )}

      <Card className="mt-6" padded={false}>
        <div className="p-5 pb-0 sm:p-6 sm:pb-0">
          <CardHeader title="Outside services" description="Each one has a timeout, one retry, a cache and a circuit breaker that pauses calls after repeated failures." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-y border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold sm:px-6">Service</th>
                <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Calls</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">From cache</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Typical speed</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Slowest 5%</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold sm:px-6">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.upstreams.map((u) => {
                const state = u.enabled ? BREAKER[u.breaker] : { tone: 'neutral', label: 'Switched off' };
                return (
                  <tr key={u.name}>
                    <th scope="row" className="px-5 py-4 font-normal sm:px-6">
                      <a href={u.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-ink hover:underline">
                        {u.label}
                        <ArrowSquareOutIcon size={14} aria-hidden="true" />
                        <span className="sr-only">(opens the provider documentation)</span>
                      </a>
                      <span className="block text-muted">{u.purpose}</span>
                      {u.lastError && (
                        <span className="mt-1 block text-xs text-danger">
                          Last error {timeAgo(u.lastErrorAt)}: {u.lastError}
                        </span>
                      )}
                    </th>
                    <td className="px-3 py-4">
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </td>
                    <td className="px-3 py-4 text-right tabular-nums text-ink">{u.calls}</td>
                    <td className="px-3 py-4 text-right tabular-nums text-ink">{u.cacheHitRate === null ? '–' : `${u.cacheHitRate}%`}</td>
                    <td className="px-3 py-4 text-right tabular-nums text-ink">{ms(u.latencyMs.p50)}</td>
                    <td className="px-3 py-4 text-right tabular-nums text-ink">{ms(u.latencyMs.p95)}</td>
                    <td className="px-5 py-4 text-right tabular-nums text-ink sm:px-6">{u.failures}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Request assistant" />
          <Badge tone={data.assistant.engine === 'claude' ? 'success' : 'info'}>{data.assistant.engine === 'claude' ? `Claude API (${data.assistant.model})` : 'Built-in rule engine'}</Badge>
          <p className="mt-3 text-sm text-ink-2">{data.assistant.note}</p>
        </Card>
        <Card>
          <CardHeader title="Push notifications" />
          <Badge tone="success">Web Push (VAPID)</Badge>
          <p className="mt-3 text-sm text-ink-2">
            {data.push.devices} device{data.push.devices === 1 ? '' : 's'} registered. Server key: {data.push.keySource}.
          </p>
        </Card>
        <Card>
          <CardHeader title="Email" />
          <Badge tone={data.email.transport === 'smtp' ? 'success' : 'warning'}>{data.email.transport === 'smtp' ? 'SMTP' : 'Not configured'}</Badge>
          <p className="mt-3 text-sm text-ink-2">{data.email.transport === 'smtp' ? 'Verification and reset emails are delivered by SMTP.' : 'Emails are written to the server log. Set SMTP_HOST to deliver them.'}</p>
        </Card>
      </div>

      <p className="mt-6 text-sm text-muted">
        The full API these services plug into is documented in the{' '}
        <a href="/api/docs" className="font-semibold text-accent-text underline">
          interactive API reference
        </a>
        .
      </p>
    </div>
  );
}
