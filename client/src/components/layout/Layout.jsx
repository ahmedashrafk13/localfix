import { EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api, trackEvent } from '../../lib/api.js';
import { OfflineBanner } from '../platform/OfflineBanner.jsx';
import { Button } from '../ui/Button.jsx';
import { InlineAlert } from '../ui/States.jsx';
import { Footer } from './Footer.jsx';
import { Header } from './Header.jsx';
import { TabBar } from './TabBar.jsx';

export function PageFallback() {
  return (
    <div className="container-page flex min-h-[50dvh] items-center justify-center" role="status">
      <span className="size-8 animate-spin rounded-full border-[3px] border-line border-t-accent" aria-hidden="true" />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}

function VerifyEmailBanner() {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [devLink, setDevLink] = useState('');
  if (!user?.mustVerifyEmail) return null;

  const resend = async () => {
    setBusy(true);
    try {
      const res = await api.post('/auth/resend-verification');
      if (res.devLink) setDevLink(res.devLink);
      toast.success(`We sent a new link to ${user.email}.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page mt-4">
      <InlineAlert
        tone="warning"
        icon={EnvelopeSimpleIcon}
        title="Confirm your email to start posting and sending offers"
        action={
          <Button variant="secondary" size="sm" onClick={resend} loading={busy}>
            Resend link
          </Button>
        }
      >
        We sent a link to <strong>{user.email}</strong>.
        {devLink && (
          <>
            {' '}
            Development mode (no email server):{' '}
            <a href={devLink} className="font-semibold text-accent-text underline">
              open the verification link
            </a>
            .
          </>
        )}
      </InlineAlert>
    </div>
  );
}

export function Layout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    trackEvent('page_view', { path: location.pathname });
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-[70] rounded-full bg-accent px-4 py-2 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <OfflineBanner />
      <Header />
      <VerifyEmailBanner />
      <main id="main" className="flex-1 pb-24 md:pb-0">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <TabBar />
    </div>
  );
}
