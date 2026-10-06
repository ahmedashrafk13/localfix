import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { dashboardPath, useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import { useDocumentTitle } from '../../lib/hooks.js';

export default function VerifyEmail() {
  useDocumentTitle('Confirm your email');
  const [params] = useSearchParams();
  const { user, setUser } = useAuth();
  const [state, setState] = useState({ status: 'loading', message: '' });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get('token');
    if (!token) {
      setState({ status: 'error', message: 'This link is missing its token. Open the link from your email again.' });
      return;
    }
    api
      .post('/auth/verify-email', { token })
      .then((res) => {
        setState({ status: 'done', message: '' });
        if (user && res.user && user.id === res.user.id) setUser(res.user);
      })
      .catch((err) => setState({ status: 'error', message: err.message }));
  }, [params, user, setUser]);

  return (
    <div className="container-page flex justify-center py-16">
      <Card className="w-full max-w-lg text-center shadow-soft sm:p-10" aria-live="polite">
        {state.status === 'loading' && (
          <>
            <span className="mx-auto block size-10 animate-spin rounded-full border-4 border-line border-t-accent" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-bold text-ink">Confirming your email</h1>
          </>
        )}
        {state.status === 'done' && (
          <>
            <CheckCircleIcon size={56} weight="fill" className="mx-auto text-success" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold text-ink">Email confirmed</h1>
            <p className="mt-2 text-muted">Thanks. Your account is fully active.</p>
            <ButtonLink to={user ? dashboardPath(user) : '/login'} className="mt-6">
              {user ? 'Go to your dashboard' : 'Log in'}
            </ButtonLink>
          </>
        )}
        {state.status === 'error' && (
          <>
            <WarningCircleIcon size={56} weight="fill" className="mx-auto text-danger" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold text-ink">We could not confirm your email</h1>
            <p className="mt-2 text-muted">{state.message}</p>
            <ButtonLink to={user ? dashboardPath(user) : '/login'} variant="secondary" className="mt-6">
              {user ? 'Back to dashboard to resend' : 'Log in to resend the link'}
            </ButtonLink>
          </>
        )}
      </Card>
    </div>
  );
}
