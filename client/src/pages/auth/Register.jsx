import { BriefcaseIcon, CheckIcon, HouseLineIcon, UserPlusIcon } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, Select } from '../../components/ui/Field.jsx';
import { InlineAlert } from '../../components/ui/States.jsx';
import { useAppData } from '../../context/AppDataContext.jsx';
import { dashboardPath, useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useDocumentTitle } from '../../lib/hooks.js';
import { CategoryIcon } from '../../lib/icons.jsx';
import { AuthShell } from './AuthShell.jsx';

const ROLES = [
  { value: 'customer', title: 'I need something fixed', text: 'Post requests and compare offers', icon: HouseLineIcon },
  { value: 'provider', title: 'I offer a service', text: 'Find jobs and send offers', icon: BriefcaseIcon },
];

function validate(form) {
  const e = {};
  if (form.name.trim().length < 2) e.name = 'Enter your full name.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email address.';
  if (!/^\+?[0-9\s-]{10,16}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number, e.g. 0300 1234567.';
  if (form.password.length < 8) e.password = 'Use at least 8 characters.';
  else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'Include at least one letter and one number.';
  if (!form.city) e.city = 'Choose your city.';
  if (form.role === 'provider' && form.categories.length === 0) e.categories = 'Choose at least one service you offer.';
  return e;
}

export default function Register() {
  useDocumentTitle('Create an account');
  const { register } = useAuth();
  const { categories, cities, areasFor } = useAppData();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    role: params.get('role') === 'provider' ? 'provider' : 'customer',
    name: '',
    email: '',
    phone: '',
    password: '',
    city: 'Islamabad',
    area: '',
    categories: [],
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const areas = useMemo(() => areasFor(form.city), [areasFor, form.city]);

  const strength = useMemo(() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 8) s += 1;
    if (/[A-Za-z]/.test(p) && /\d/.test(p)) s += 1;
    if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) s += 1;
    return s;
  }, [form.password]);

  const toggleCategory = (id) =>
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(id) ? f.categories.filter((c) => c !== id) : f.categories.length < 6 ? [...f.categories, id] : f.categories,
    }));

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    setServerError('');
    if (Object.keys(v).length) {
      document.getElementById(`reg-${Object.keys(v)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await register({ ...form, email: form.email.trim(), name: form.name.trim() });
      toast.success('Your account is ready.');
      if (res.devLink) toast.info('Development mode: use the banner link to confirm your email.', { duration: 8000 });
      const next = params.get('next');
      const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : form.role === 'provider' ? '/provider/profile' : dashboardPath(res.user);
      navigate(dest, { replace: true });
    } catch (err) {
      setErrors(err.fields || {});
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      description="Free for customers and providers. It takes about a minute."
      aside={
        <div className="rounded-card bg-accent-soft p-6 sm:p-8">
          <h2 className="text-xl font-bold text-ink">{form.role === 'provider' ? 'What happens next for providers' : 'What happens next'}</h2>
          <ol className="mt-4 space-y-3 text-ink-2">
            {(form.role === 'provider'
              ? ['Confirm your email address.', 'Complete your profile and upload your CNIC.', 'Our team verifies you, usually within one working day.', 'Get alerts for jobs in your trade and send offers.']
              : ['Confirm your email address.', 'Post your first request in three short steps.', 'Compare offers from verified providers and chat.', 'Hire the one you trust, then leave a review.']
            ).map((t) => (
              <li key={t} className="flex gap-3">
                <CheckIcon size={20} weight="bold" className="mt-0.5 shrink-0 text-accent-text" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ol>
        </div>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {serverError && (
          <InlineAlert tone="danger" title="Could not create your account">
            {serverError}
          </InlineAlert>
        )}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">I want to</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLES.map((r) => {
              const checked = form.role === r.value;
              return (
                <label
                  key={r.value}
                  className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--accent-ring)] ${
                    checked ? 'border-accent bg-accent-soft' : 'border-line-strong hover:border-ink/30'
                  }`}
                >
                  <input type="radio" name="role" value={r.value} checked={checked} onChange={set('role')} className="sr-only" />
                  <r.icon size={24} className={checked ? 'text-accent-text' : 'text-muted'} aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-bold text-ink">{r.title}</span>
                    <span className="block text-xs text-muted">{r.text}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field label="Full name" required error={errors.name} id="reg-name">
          {(p) => <Input {...p} autoComplete="name" value={form.name} onChange={set('name')} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email address" required error={errors.email} id="reg-email">
            {(p) => <Input {...p} type="email" inputMode="email" autoComplete="email" spellCheck={false} value={form.email} onChange={set('email')} />}
          </Field>
          <Field label="Mobile number" required error={errors.phone} id="reg-phone" help="Shared only with the person you hire or who hires you.">
            {(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" value={form.phone} onChange={set('phone')} />}
          </Field>
        </div>
        <Field label="Password" required error={errors.password} id="reg-password" help="At least 8 characters with a letter and a number.">
          {(p) => (
            <div>
              <Input {...p} type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
              {form.password && (
                <div className="mt-2 flex items-center gap-2" aria-live="polite">
                  <div className="flex flex-1 gap-1" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={`h-1.5 flex-1 rounded-full ${i < strength ? (strength === 3 ? 'bg-success' : strength === 2 ? 'bg-warning' : 'bg-danger') : 'bg-line'}`} />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-muted">Strength: {['too weak', 'weak', 'good', 'strong'][strength]}</span>
                </div>
              )}
            </div>
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="City" required error={errors.city} id="reg-city">
            {(p) => (
              <Select {...p} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value, area: '' }))}>
                {cities.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Area" optional id="reg-area">
            {(p) => (
              <Select {...p} value={form.area} onChange={set('area')}>
                <option value="">Choose area</option>
                {areas.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {form.role === 'provider' && (
          <fieldset id="reg-categories" tabIndex={-1} aria-describedby={errors.categories ? 'reg-cat-error' : undefined}>
            <legend className="mb-2 text-sm font-semibold text-ink">
              Services you offer <span className="font-normal text-muted">(up to 6)</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const checked = form.categories.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--accent-ring)] ${
                      checked ? 'border-accent bg-accent-soft text-accent-text' : 'border-line-strong text-ink-2 hover:border-ink/30'
                    }`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleCategory(c.id)} className="sr-only" />
                    <CategoryIcon name={c.icon} size={16} />
                    {c.name}
                  </label>
                );
              })}
            </div>
            {errors.categories && (
              <p id="reg-cat-error" className="mt-1.5 text-[0.82rem] font-medium text-danger" role="alert">
                {errors.categories}
              </p>
            )}
          </fieldset>
        )}

        <p className="text-xs text-muted">
          By creating an account you agree to our{' '}
          <Link to="/terms" className="font-semibold text-ink-2 underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="font-semibold text-ink-2 underline">
            Privacy policy
          </Link>
          .
        </p>
        <Button type="submit" block size="lg" loading={busy} icon={UserPlusIcon}>
          Create account
        </Button>
        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent-text hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
