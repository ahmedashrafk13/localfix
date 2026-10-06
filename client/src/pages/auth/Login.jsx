import { EyeIcon, EyeSlashIcon, SignInIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { InlineAlert } from '../../components/ui/States.jsx';
import { dashboardPath, useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useDocumentTitle } from '../../lib/hooks.js';
import { AuthShell } from './AuthShell.jsx';

// Sample accounts created by the seed script (server/src/seed/data.js).
const SAMPLES = [
  { email: 'ayesha@localfix.test', password: 'Demo@1234', name: 'Ayesha Siddiqui', role: 'Customer', avatar: '/uploads/seed/avatars/c01.webp', note: 'Has 4 offers to compare, a job to confirm and one to review' },
  { email: 'tariq@localfix.test', password: 'Demo@1234', name: 'Tariq Mehmood', role: 'Provider (plumber)', avatar: '/uploads/seed/avatars/p01.webp', note: 'Verified, has an active job, offers and reviews' },
  { email: 'admin@localfix.test', password: 'Admin@1234', name: 'Ahmed Ashraf', role: 'Admin', avatar: '/uploads/seed/avatars/admin.webp', note: 'Verifications, reports and success criteria' },
  { email: 'bilal@localfix.test', password: 'Demo@1234', name: 'Bilal Ahmed', role: 'Customer', avatar: '/uploads/seed/avatars/c02.webp', note: 'Has a plumber on the way' },
  { email: 'moin@localfix.test', password: 'Demo@1234', name: 'Moin Akram', role: 'Provider, pending check', avatar: '/uploads/seed/avatars/p14.webp', note: 'Waiting for admin verification' },
  { email: 'samina@localfix.test', password: 'Demo@1234', name: 'Samina Yousaf', role: 'Provider, new', avatar: '/uploads/seed/avatars/p16.webp', note: 'Can upload ID documents' },
];

export default function Login() {
  useDocumentTitle('Log in');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const doLogin = async (e, creds) => {
    e?.preventDefault();
    const em = creds?.email ?? email;
    const pw = creds?.password ?? password;
    if (!em || !pw) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const user = await login(em, pw);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
      const next = params.get('next');
      navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : dashboardPath(user), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Log in"
      description="Welcome back. Pick up where you left off."
      aside={
        <section aria-labelledby="samples-heading" className="rounded-card border border-dashed border-line-strong bg-surface p-5 sm:p-6">
          <h2 id="samples-heading" className="text-lg font-bold text-ink">
            Sample accounts for testing
          </h2>
          <p className="mt-1 text-sm text-muted">
            One click logs you in. Customer and provider passwords are <code className="rounded bg-surface-3 px-1.5 py-0.5 text-ink">Demo@1234</code>, the admin
            password is <code className="rounded bg-surface-3 px-1.5 py-0.5 text-ink">Admin@1234</code>.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {SAMPLES.map((s) => (
              <li key={s.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(s.email);
                    setPassword(s.password);
                    doLogin(null, s);
                  }}
                  disabled={busy}
                  className="flex w-full items-start gap-3 rounded-2xl border border-line bg-surface-2 p-3 text-left transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-60"
                >
                  <Avatar src={s.avatar} name={s.name} size="sm" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{s.name}</span>
                    <span className="block text-xs font-semibold text-accent-text">{s.role}</span>
                    <span className="mt-0.5 block text-xs text-muted">{s.note}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      }
    >
      <form onSubmit={doLogin} noValidate className="space-y-5">
        {error && (
          <InlineAlert tone="danger" title="Could not log in">
            {error}
          </InlineAlert>
        )}
        <Field label="Email address" required>
          {(p) => <Input {...p} type="email" autoComplete="email" spellCheck={false} inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" required>
          {(p) => (
            <div className="relative">
              <Input {...p} type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-12" />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-ink"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          )}
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-semibold text-accent-text hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" block size="lg" loading={busy} icon={SignInIcon}>
          Log in
        </Button>
        <p className="text-center text-sm text-muted">
          New to LocalFix?{' '}
          <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next'))}` : ''}`} className="font-semibold text-accent-text hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
