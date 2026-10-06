import { CameraIcon, DesktopIcon, DownloadSimpleIcon, MoonIcon, SunIcon, TrashIcon } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { ChoiceChips, Field, Input, Select } from '../components/ui/Field.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { PageHeader } from '../components/ui/Nav.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { memberSince } from '../lib/format.js';
import { useDocumentTitle } from '../lib/hooks.js';
import { storage } from '../lib/storage.js';

function ProfileCard() {
  const { user, setUser } = useAuth();
  const { cities, areasFor } = useAppData();
  const toast = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState({ name: user.name, phone: user.phone, city: user.city, area: user.area });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await api.patch('/users/me', form);
      setUser(res.user);
      toast.success('Profile saved.');
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error('Choose a JPG, PNG or WebP image under 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const res = await api.upload('/users/me/avatar', { files: { avatar: file } });
      setUser(res.user);
      toast.success('Photo updated.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Profile" description={`Member since ${memberSince(user.createdAt)}`} />
      <div className="mb-6 flex items-center gap-4">
        <Avatar src={user.avatar} name={user.name} size="xl" />
        <div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="avatar-input" onChange={(e) => uploadAvatar(e.target.files[0])} />
          <Button variant="secondary" size="sm" icon={CameraIcon} loading={uploading} onClick={() => fileRef.current?.click()}>
            Change photo
          </Button>
          <p className="mt-1.5 text-xs text-muted">Square photos work best. Location data is removed on upload.</p>
        </div>
      </div>
      <form onSubmit={save} noValidate className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" required error={errors.name}>
            {(p) => <Input {...p} autoComplete="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />}
          </Field>
          <Field label="Mobile number" required error={errors.phone}>
            {(p) => <Input {...p} type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />}
          </Field>
          <Field label="City">
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
          <Field label="Area">
            {(p) => (
              <Select {...p} value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}>
                <option value="">Choose area</option>
                {areasFor(form.city).map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted">Email:</span>
          <span className="font-semibold text-ink">{user.email}</span>
          <Badge tone={user.emailVerified ? 'success' : 'warning'}>{user.emailVerified ? 'Confirmed' : 'Not confirmed'}</Badge>
        </div>
        <Button type="submit" loading={busy}>
          Save profile
        </Button>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    const v = {};
    if (!form.currentPassword) v.currentPassword = 'Enter your current password.';
    if (form.newPassword.length < 8 || !/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword)) v.newPassword = 'Use at least 8 characters with a letter and a number.';
    if (form.confirm !== form.newPassword) v.confirm = 'The passwords do not match.';
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await api.patch('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed. Other devices have been signed out.');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setErrors(err.fields || { currentPassword: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Password" description="Changing it signs you out everywhere else." />
      <form onSubmit={save} noValidate className="space-y-5">
        <Field label="Current password" required error={errors.currentPassword}>
          {(p) => <Input {...p} type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="New password" required error={errors.newPassword}>
            {(p) => <Input {...p} type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} />}
          </Field>
          <Field label="Repeat new password" required error={errors.confirm}>
            {(p) => <Input {...p} type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} />}
          </Field>
        </div>
        <Button type="submit" variant="secondary" loading={busy}>
          Change password
        </Button>
      </form>
    </Card>
  );
}

function AppearanceCard() {
  const { preference, setTheme } = useTheme();
  return (
    <Card>
      <CardHeader title="Appearance" description="Saved on this device." />
      <ChoiceChips
        legend="Theme"
        name="theme"
        value={preference}
        onChange={setTheme}
        options={[
          { value: 'system', label: 'Match device', icon: <DesktopIcon size={16} aria-hidden="true" /> },
          { value: 'light', label: 'Light', icon: <SunIcon size={16} aria-hidden="true" /> },
          { value: 'dark', label: 'Dark', icon: <MoonIcon size={16} aria-hidden="true" /> },
        ]}
      />
    </Card>
  );
}

function PrivacyCard() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await api.del('/users/me', { password });
      storage.remove('requestDraft');
      setUser(null);
      toast.success('Your account and personal data have been deleted.');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Your data" description="Download a copy of everything we hold about you, or delete your account." />
      <div className="flex flex-wrap gap-3">
        <a
          href="/api/users/me/export"
          download
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-5 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          <DownloadSimpleIcon size={18} weight="bold" aria-hidden="true" />
          Download my data
        </a>
        {user.role !== 'admin' && (
          <Button variant="danger-ghost" icon={TrashIcon} onClick={() => setOpen(true)}>
            Delete account
          </Button>
        )}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete your account?"
        description="This cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Keep my account
            </Button>
            <Button variant="danger" loading={busy} onClick={remove} disabled={!password}>
              Delete permanently
            </Button>
          </>
        }
      >
        <ul className="mb-5 list-disc space-y-1.5 pl-5 text-sm text-ink-2">
          <li>Open requests are cancelled and pending offers withdrawn.</li>
          <li>Your profile, photos and notifications are deleted.</li>
          <li>Past reviews stay on providers' profiles but show "Deleted user".</li>
        </ul>
        <Field label="Enter your password to confirm" required error={error}>
          {(p) => <Input {...p} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
      </Modal>
    </Card>
  );
}

export default function Settings() {
  useDocumentTitle('Account settings');
  return (
    <div className="container-page max-w-3xl py-8 sm:py-10">
      <PageHeader title="Account settings" description="Manage your profile, security and data." />
      <div className="space-y-6">
        <ProfileCard />
        <PasswordCard />
        <AppearanceCard />
        <PrivacyCard />
      </div>
    </div>
  );
}
