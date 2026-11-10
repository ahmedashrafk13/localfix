import { BellRingingIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { disablePush, enablePush, pushState } from '../../lib/push.js';
import { Button } from '../ui/Button.jsx';
import { Card, CardHeader } from '../ui/Card.jsx';
import { Toggle } from '../ui/Field.jsx';

const HELP = {
  unsupported: 'This browser does not support push notifications. On an iPhone, add LocalFix to your Home Screen first.',
  denied: 'Notifications are blocked for this site. Allow them in your browser’s site settings, then come back.',
};

/** Settings card: turn Web Push on or off for this device and send a test notification. */
export function NotificationsCard() {
  const toast = useToast();
  const [state, setState] = useState('loading'); // loading | unsupported | denied | on | off
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    pushState().then(setState).catch(() => setState('unsupported'));
  }, []);

  const toggle = async (next) => {
    setBusy(true);
    try {
      if (next) {
        await enablePush();
        toast.success('Push notifications are on for this device.');
      } else {
        await disablePush();
        toast.success('Push notifications are off for this device.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setState(await pushState().catch(() => 'unsupported'));
      setBusy(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await api.post('/push/test');
      if (res.sent) toast.success('Test sent. It should appear in a few seconds.');
      else toast.error('The test could not be delivered. Turn notifications off and on again.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Notifications" description="Hear about new offers, messages and job updates even when LocalFix is closed." />
      <div className="flex items-start gap-3">
        <BellRingingIcon size={24} className="mt-0.5 shrink-0 text-accent-text" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <Toggle
            label="Push notifications on this device"
            description={HELP[state] || 'Sent through your browser. You can turn them off at any time.'}
            checked={state === 'on'}
            disabled={busy || state === 'loading' || state === 'unsupported' || state === 'denied'}
            onChange={toggle}
          />
          {state === 'on' && (
            <Button variant="secondary" size="sm" className="mt-4" onClick={test} loading={testing}>
              Send a test notification
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
