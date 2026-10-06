import { EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { InlineAlert } from '../../components/ui/States.jsx';
import { api } from '../../lib/api.js';
import { useDocumentTitle } from '../../lib/hooks.js';
import { AuthShell } from './AuthShell.jsx';

export default function ForgotPassword() {
  useDocumentTitle('Reset your password');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter the email address you signed up with.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      setResult(await api.post('/auth/forgot-password', { email: email.trim() }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Forgot your password?" description="Enter your email and we will send you a link to choose a new one.">
      {result ? (
        <div className="space-y-5">
          <InlineAlert tone="success" icon={EnvelopeSimpleIcon} title="Check your inbox">
            {result.message} The link is valid for one hour.
          </InlineAlert>
          {result.devLink && (
            <InlineAlert tone="info" title="Development mode">
              No email server is configured, so here is the link:{' '}
              <a href={result.devLink} className="font-semibold text-accent-text underline">
                reset your password
              </a>
              .
            </InlineAlert>
          )}
          <Link to="/login" className="inline-block font-semibold text-accent-text hover:underline">
            Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <Field label="Email address" required error={error}>
            {(p) => <Input {...p} type="email" autoComplete="email" spellCheck={false} inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          <Button type="submit" block size="lg" loading={busy}>
            Send reset link
          </Button>
          <p className="text-center text-sm text-muted">
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-accent-text hover:underline">
              Log in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
