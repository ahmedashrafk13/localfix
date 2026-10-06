import { CheckCircleIcon, ClockIcon, EnvelopeSimpleIcon, MapPinIcon, PaperPlaneTiltIcon, PhoneIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { InlineAlert } from '../../components/ui/States.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import { useDocumentTitle } from '../../lib/hooks.js';

const TOPICS = [
  { value: 'general', label: 'General question' },
  { value: 'account', label: 'My account' },
  { value: 'provider', label: 'Becoming or being a provider' },
  { value: 'safety', label: 'Safety concern' },
  { value: 'billing', label: 'Payments with a provider' },
  { value: 'other', label: 'Something else' },
];

export default function Contact() {
  useDocumentTitle('Contact support');
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', topic: 'general', message: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (form.name.trim().length < 2) v.name = 'Enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) v.email = 'Enter a valid email address so we can reply.';
    if (form.message.trim().length < 10) v.message = 'Write at least 10 characters.';
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    setServerError('');
    try {
      const res = await api.post('/contact', { ...form, name: form.name.trim(), email: form.email.trim(), message: form.message.trim() });
      setDone(res.message);
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold text-ink sm:text-5xl">Contact support</h1>
        <p className="mt-4 text-lg text-ink-2">Questions about a request, an offer or your account? Send us a message and we will reply within one working day.</p>
      </header>
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="sm:p-8">
          {done ? (
            <div className="py-6 text-center" role="status">
              <CheckCircleIcon size={56} weight="fill" className="mx-auto text-success" aria-hidden="true" />
              <h2 className="mt-4 text-2xl font-bold text-ink">Message sent</h2>
              <p className="mt-2 text-ink-2">{done}</p>
              <Button
                variant="secondary"
                className="mt-6"
                onClick={() => {
                  setDone('');
                  setForm((f) => ({ ...f, message: '' }));
                }}
              >
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-5">
              {serverError && <InlineAlert tone="danger" title="Could not send your message">{serverError}</InlineAlert>}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Your name" required error={errors.name}>
                  {(p) => <Input {...p} autoComplete="name" value={form.name} onChange={set('name')} />}
                </Field>
                <Field label="Email address" required error={errors.email}>
                  {(p) => <Input {...p} type="email" autoComplete="email" spellCheck={false} value={form.email} onChange={set('email')} />}
                </Field>
              </div>
              <Field label="Topic">
                {(p) => (
                  <Select {...p} value={form.topic} onChange={set('topic')}>
                    {TOPICS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Message" required error={errors.message} help="Please do not include passwords or card numbers.">
                {(p) => <Textarea {...p} rows={6} maxLength={2000} value={form.message} onChange={set('message')} />}
              </Field>
              <Button type="submit" size="lg" loading={busy} icon={PaperPlaneTiltIcon}>
                Send message
              </Button>
            </form>
          )}
        </Card>
        <aside className="space-y-5">
          <Card>
            <h2 className="text-lg font-bold text-ink">Other ways to reach us</h2>
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex gap-3">
                <EnvelopeSimpleIcon size={20} className="mt-0.5 shrink-0 text-accent-text" aria-hidden="true" />
                <a href="mailto:support@localfix.test" className="font-semibold text-ink hover:underline">
                  support@localfix.test
                </a>
              </li>
              <li className="flex gap-3">
                <PhoneIcon size={20} className="mt-0.5 shrink-0 text-accent-text" aria-hidden="true" />
                <a href="tel:+92510000100" className="font-semibold text-ink hover:underline">
                  +92 51 0000 100
                </a>
              </li>
              <li className="flex gap-3 text-ink-2">
                <ClockIcon size={20} className="mt-0.5 shrink-0 text-accent-text" aria-hidden="true" />
                Monday to Saturday, 9:00 to 18:00
              </li>
              <li className="flex gap-3 text-ink-2">
                <MapPinIcon size={20} className="mt-0.5 shrink-0 text-accent-text" aria-hidden="true" />
                Serving Islamabad and Rawalpindi
              </li>
            </ul>
          </Card>
          <Card className="bg-surface-2">
            <h2 className="text-lg font-bold text-ink">Quick answers</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/faq" className="font-semibold text-accent-text hover:underline">
                  Frequently asked questions
                </Link>
              </li>
              <li>
                <Link to="/safety" className="font-semibold text-accent-text hover:underline">
                  Trust and safety guide
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="font-semibold text-accent-text hover:underline">
                  How LocalFix works
                </Link>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
