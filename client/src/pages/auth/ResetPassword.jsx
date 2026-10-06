import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { InlineAlert } from '../../components/ui/States.jsx';
import { dashboardPath, useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { useDocumentTitle } from '../../lib/hooks.js';
import { AuthShell } from './AuthShell.jsx';

export default function ResetPassword() {
  useDocumentTitle('Choose a new password');
  const [params] = useSearchParams();
  const { setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) v.password = 'Use at least 8 characters with a letter and a number.';
    if (confirm !== password) v.confirm = 'The passwords do not match.';
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    setServerError('');
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      toast.success('Your password has been changed. Other devices were signed out.');
      if (res.user) {
        setUser(res.user);
        navigate(dashboardPath(res.user), { replace: true });
      } else navigate('/login', { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Reset link missing">
        <InlineAlert tone="danger">This page needs the link from your email. Request a new one below.</InlineAlert>
        <Link to="/forgot-password" className="mt-5 inline-block font-semibold text-accent-text hover:underline">
          Request a new reset link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" description="After this, you will be signed out on every other device.">
      <form onSubmit={submit} noValidate className="space-y-5">
        {serverError && (
          <InlineAlert tone="danger" title="Could not reset your password">
            {serverError}{' '}
            <Link to="/forgot-password" className="font-semibold underline">
              Request a new link
            </Link>
          </InlineAlert>
        )}
        <Field label="New password" required error={errors.password} help="At least 8 characters with a letter and a number.">
          {(p) => <Input {...p} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Field label="Repeat new password" required error={errors.confirm}>
          {(p) => <Input {...p} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
        </Field>
        <Button type="submit" block size="lg" loading={busy}>
          Save new password
        </Button>
      </form>
    </AuthShell>
  );
}
