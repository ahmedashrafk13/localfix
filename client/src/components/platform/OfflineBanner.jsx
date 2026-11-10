import { WifiSlashIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

/** Tells the user when the device is offline (the service worker keeps the app shell available). */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return (
    <div role="status" aria-live="polite">
      {!online && (
        <p className="flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-sm font-semibold text-bg">
          <WifiSlashIcon size={18} aria-hidden="true" />
          You are offline. Pages you have opened still work; new offers and messages will arrive when you reconnect.
        </p>
      )}
    </div>
  );
}
