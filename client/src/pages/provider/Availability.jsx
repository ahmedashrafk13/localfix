import { FloppyDiskIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { Toggle } from '../../components/ui/Field.jsx';
import { PageHeader } from '../../components/ui/Nav.jsx';
import { InlineAlert } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { DAYS } from '../../lib/format.js';
import { useDocumentTitle } from '../../lib/hooks.js';

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function Availability() {
  useDocumentTitle('Availability');
  const { user, setUser } = useAuth();
  const toast = useToast();
  const current = user.provider?.availability || { availableNow: true, weekly: [] };
  const [availableNow, setAvailableNow] = useState(current.availableNow);
  const [week, setWeek] = useState(() =>
    [0, 1, 2, 3, 4, 5, 6].map((d) => current.weekly.find((w) => w.day === d) || { day: d, enabled: d !== 0, from: '09:00', to: '18:00' })
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setDay = (day, patch) => setWeek((w) => w.map((x) => (x.day === day ? { ...x, ...patch } : x)));

  const copyToAll = (day) => {
    const src = week.find((w) => w.day === day);
    setWeek((w) => w.map((x) => (x.day === 0 && day !== 0 ? x : { ...x, enabled: src.enabled, from: src.from, to: src.to })));
  };

  const save = async () => {
    const bad = week.find((d) => d.enabled && d.from >= d.to);
    if (bad) {
      setError(`${DAYS[bad.day]}: closing time must be after opening time.`);
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await api.put('/providers/me/availability', { availableNow, weekly: week });
      setUser(res.user);
      toast.success('Availability saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page max-w-3xl py-8 sm:py-10">
      <PageHeader title="Availability" description="Customers see your working hours and whether you are free right now when comparing offers." />
      <div className="space-y-6">
        <Card>
          <Toggle label="Available for jobs now" description="Turn off when you are busy or on leave." checked={availableNow} onChange={setAvailableNow} />
        </Card>

        <Card>
          <CardHeader title="Weekly hours" description="Times are in Pakistan time." />
          <ul className="divide-y divide-line">
            {ORDER.map((d) => {
              const day = week.find((w) => w.day === d);
              return (
                <li key={d} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                  <label className="flex w-40 cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={day.enabled} onChange={(e) => setDay(d, { enabled: e.target.checked })} className="size-5 cursor-pointer accent-[var(--accent)]" />
                    <span className="font-semibold text-ink">{DAYS[d]}</span>
                  </label>
                  {day.enabled ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`from-${d}`}>
                        {DAYS[d]} opening time
                      </label>
                      <input
                        id={`from-${d}`}
                        type="time"
                        value={day.from}
                        onChange={(e) => setDay(d, { from: e.target.value })}
                        className="min-h-11 rounded-field border border-line-strong bg-surface px-3 text-ink focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--accent-ring)]"
                      />
                      <span className="text-sm text-muted">to</span>
                      <label className="sr-only" htmlFor={`to-${d}`}>
                        {DAYS[d]} closing time
                      </label>
                      <input
                        id={`to-${d}`}
                        type="time"
                        value={day.to}
                        onChange={(e) => setDay(d, { to: e.target.value })}
                        className="min-h-11 rounded-field border border-line-strong bg-surface px-3 text-ink focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--accent-ring)]"
                      />
                      {d === 1 && (
                        <button type="button" onClick={() => copyToAll(1)} className="min-h-11 px-2 text-sm font-semibold text-accent-text hover:underline">
                          Copy to Tuesday to Saturday
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted">Closed</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        {error && (
          <InlineAlert tone="danger" title="Check your hours">
            {error}
          </InlineAlert>
        )}
        <Button size="lg" icon={FloppyDiskIcon} loading={busy} onClick={save}>
          Save availability
        </Button>
      </div>
    </div>
  );
}
