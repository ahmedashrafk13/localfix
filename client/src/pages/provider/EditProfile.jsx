import {
  CheckCircleIcon,
  CrosshairIcon,
  EyeIcon,
  FloppyDiskIcon,
  HourglassMediumIcon,
  IdentificationCardIcon,
  PlusIcon,
  TrashIcon,
  UploadSimpleIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { ImagePicker } from '../../components/ImagePicker.jsx';
import { LocationPicker } from '../../components/LazyMaps.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button, ButtonLink, IconButton } from '../../components/ui/Button.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { ChoiceChips, Field, Input, Textarea } from '../../components/ui/Field.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { PageHeader } from '../../components/ui/Nav.jsx';
import { InlineAlert } from '../../components/ui/States.jsx';
import { useAppData } from '../../context/AppDataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';
import { useDocumentTitle } from '../../lib/hooks.js';
import { CategoryIcon } from '../../lib/icons.jsx';

function ProfileForm() {
  const { user, setUser } = useAuth();
  const { categories, cities } = useAppData();
  const toast = useToast();
  const p = user.provider;
  const [form, setForm] = useState({
    headline: p.headline || '',
    bio: p.bio || '',
    experienceYears: p.experienceYears ?? 0,
    startingPrice: p.startingPrice ?? '',
    categories: (p.categories || []).map((c) => c.id),
    serviceAreas: p.serviceAreas || [],
    certifications: (p.certifications || []).map((c) => ({ title: c.title, issuer: c.issuer || '', year: c.year || '' })),
    location: p.location || null,
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const toggle = (key, value, max) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : f[key].length < max ? [...f[key], value] : f[key],
    }));

  const setCert = (i, patch) => setForm((f) => ({ ...f, certifications: f.certifications.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  const defaultPoint = () => {
    const area = cities.flatMap((c) => c.areas.map((a) => ({ ...a, city: c.name }))).find((a) => a.name === user.area && a.city === user.city);
    return area ? { lat: area.lat, lng: area.lng } : { lat: 33.6938, lng: 73.0652 };
  };

  const save = async (e) => {
    e.preventDefault();
    const v = {};
    if (!form.categories.length) v.categories = 'Choose at least one service.';
    if (form.headline.length > 100) v.headline = 'Keep the headline under 100 characters.';
    if (form.certifications.some((c) => c.title.trim().length < 2)) v.certifications = 'Every certification needs a title, or remove the empty row.';
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const res = await api.patch('/providers/me', {
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        experienceYears: Number(form.experienceYears) || 0,
        startingPrice: form.startingPrice === '' ? null : Number(form.startingPrice),
        categories: form.categories,
        serviceAreas: form.serviceAreas,
        certifications: form.certifications.map((c) => ({ title: c.title.trim(), issuer: c.issuer.trim(), ...(c.year ? { year: Number(c.year) } : {}) })),
        ...(form.location ? { lat: form.location.lat, lng: form.location.lng } : {}),
      });
      setUser(res.user);
      toast.success('Profile saved.');
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      <Card>
        <CardHeader title="About you" description="This is what customers read before they hire you." />
        <div className="space-y-5">
          <Field label="Headline" error={errors.headline} help="One line about what you do best. Example: Plumber for leaks, bathroom fittings and geysers">
            {(pr) => <Input {...pr} maxLength={100} value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} />}
          </Field>
          <Field label="Bio" error={errors.bio} help={`Experience, tools you carry, the areas you know well. ${form.bio.length}/1500`}>
            {(pr) => <Textarea {...pr} rows={5} maxLength={1500} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Years of experience" error={errors.experienceYears}>
              {(pr) => <Input {...pr} type="number" min="0" max="60" value={form.experienceYears} onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))} />}
            </Field>
            <Field label="Visit charge or starting price (Rs)" optional error={errors.startingPrice}>
              {(pr) => <Input {...pr} type="number" min="0" step="50" value={form.startingPrice} onChange={(e) => setForm((f) => ({ ...f, startingPrice: e.target.value }))} />}
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Services" description="You get alerts for new requests in these services. Up to 6." />
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = form.categories.includes(c.id);
            return (
              <label
                key={c.id}
                className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--accent-ring)] ${
                  on ? 'border-accent bg-accent-soft text-accent-text' : 'border-line-strong text-ink-2 hover:border-ink/30'
                }`}
              >
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle('categories', c.id, 6)} />
                <CategoryIcon name={c.icon} size={16} />
                {c.name}
              </label>
            );
          })}
        </div>
        {errors.categories && (
          <p className="mt-2 text-[0.82rem] font-medium text-danger" role="alert">
            {errors.categories}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader title="Areas you cover" description="Customers in these areas see your offers first. Up to 15." />
        {cities.map((city) => (
          <fieldset key={city.name} className="mb-4 last:mb-0">
            <legend className="mb-2 text-sm font-semibold text-ink">{city.name}</legend>
            <div className="flex flex-wrap gap-2">
              {city.areas.map((a) => {
                const on = form.serviceAreas.includes(a.name);
                return (
                  <label
                    key={a.name}
                    className={`inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3 text-sm transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--accent-ring)] ${
                      on ? 'border-accent bg-accent-soft font-semibold text-accent-text' : 'border-line-strong text-ink-2 hover:border-ink/30'
                    }`}
                  >
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle('serviceAreas', a.name, 15)} />
                    {a.name}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </Card>

      <Card>
        <CardHeader
          title="Certifications"
          description="Training certificates and licences build trust. Up to 10."
          action={
            form.certifications.length < 10 ? (
              <Button variant="ghost" size="sm" icon={PlusIcon} onClick={() => setForm((f) => ({ ...f, certifications: [...f.certifications, { title: '', issuer: '', year: '' }] }))}>
                Add
              </Button>
            ) : null
          }
        />
        {form.certifications.length === 0 ? (
          <p className="text-sm text-muted">No certifications added yet.</p>
        ) : (
          <ul className="space-y-4">
            {form.certifications.map((c, i) => (
              <li key={i} className="grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-[1.4fr_1fr_6rem_auto] sm:items-end">
                <Field label="Title">{(pr) => <Input {...pr} value={c.title} maxLength={120} onChange={(e) => setCert(i, { title: e.target.value })} />}</Field>
                <Field label="Issued by">{(pr) => <Input {...pr} value={c.issuer} maxLength={120} onChange={(e) => setCert(i, { issuer: e.target.value })} />}</Field>
                <Field label="Year">{(pr) => <Input {...pr} type="number" min="1970" max="2100" value={c.year} onChange={(e) => setCert(i, { year: e.target.value })} />}</Field>
                <IconButton icon={TrashIcon} label={`Remove certification ${i + 1}`} className="text-danger" onClick={() => setForm((f) => ({ ...f, certifications: f.certifications.filter((_, j) => j !== i) }))} />
              </li>
            ))}
          </ul>
        )}
        {errors.certifications && (
          <p className="mt-2 text-[0.82rem] font-medium text-danger" role="alert">
            {errors.certifications}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Base location"
          description="Private. Used to measure how far requests are from you."
          action={
            !form.location ? (
              <Button variant="ghost" size="sm" icon={CrosshairIcon} onClick={() => setForm((f) => ({ ...f, location: defaultPoint() }))}>
                Set location
              </Button>
            ) : null
          }
        />
        {form.location ? (
          <LocationPicker value={form.location} onChange={(ll) => setForm((f) => ({ ...f, location: ll }))} className="h-64" />
        ) : (
          <p className="text-sm text-muted">Not set yet.</p>
        )}
      </Card>

      <div className="sticky bottom-20 z-20 flex justify-end md:bottom-4">
        <Button type="submit" size="lg" loading={busy} icon={FloppyDiskIcon} className="shadow-lift">
          Save profile
        </Button>
      </div>
    </form>
  );
}

function Gallery() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [kind, setKind] = useState('work');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);
  const gallery = user.provider.gallery || [];

  const upload = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      const res = await api.upload('/providers/me/gallery', { files: { images: files }, data: { caption, kind } });
      setUser(res.user);
      setFiles([]);
      setCaption('');
      toast.success('Photos added to your gallery.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await api.del(`/providers/me/gallery/${removing.id}`);
      setUser(res.user);
      setRemoving(null);
      toast.success('Photo removed.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Work gallery" description={`Before and after photos win more jobs. ${gallery.length}/24 photos.`} />
      {gallery.length > 0 && (
        <ul className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {gallery.map((g) => (
            <li key={g.id} className="group relative overflow-hidden rounded-2xl bg-surface-3">
              <img src={g.url} alt={g.caption || 'Work photo'} width="300" height="225" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="truncate text-xs text-ink-2">{g.caption || 'No caption'}</span>
                {g.kind !== 'work' && <Badge>{g.kind === 'before' ? 'Before' : 'After'}</Badge>}
              </div>
              <button
                type="button"
                onClick={() => setRemoving(g)}
                className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full bg-zinc-950/70 text-white hover:bg-zinc-950"
                aria-label={`Delete photo ${g.caption || ''}`}
              >
                <TrashIcon size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-4 rounded-2xl border border-dashed border-line-strong p-4">
        <ImagePicker files={files} onChange={setFiles} max={Math.min(6, 24 - gallery.length)} label="Add work photos" />
        {files.length > 0 && (
          <>
            <Field label="Caption" optional>
              {(pr) => <Input {...pr} maxLength={140} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="New bathroom mixer fitted in G-10" />}
            </Field>
            <ChoiceChips
              legend="Photo type"
              name="kind"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'work', label: 'Finished work' },
                { value: 'before', label: 'Before' },
                { value: 'after', label: 'After' },
              ]}
            />
            <Button icon={UploadSimpleIcon} loading={busy} onClick={upload}>
              Upload {files.length} photo{files.length === 1 ? '' : 's'}
            </Button>
          </>
        )}
      </div>
      <ConfirmDialog open={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={remove} busy={busy} tone="danger" title="Delete this photo?" confirmLabel="Delete" />
    </Card>
  );
}

function Verification() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const v = user.provider.verification || { status: 'unverified' };
  const [idNumber, setIdNumber] = useState('');
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [resubmit, setResubmit] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^\d{5}-?\d{7}-?\d$/.test(idNumber.trim())) errs.idNumber = 'Enter your 13-digit CNIC number, e.g. 61101-1234567-1.';
    if (!files.length) errs.document = 'Upload a clear photo of the front of your CNIC.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const res = await api.upload('/providers/me/verification', { files: { document: files[0] }, data: { idNumber: idNumber.trim() } });
      setUser(res.user);
      setResubmit(false);
      setFiles([]);
      setIdNumber('');
      toast.success('Documents submitted. We will notify you when you are verified.');
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const status = {
    verified: { tone: 'success', icon: CheckCircleIcon, label: 'Verified', text: `Your identity was confirmed${v.reviewedAt ? ` on ${formatDate(v.reviewedAt)}` : ''}. The Verified badge shows on your profile and offers.` },
    pending: { tone: 'info', icon: HourglassMediumIcon, label: 'Under review', text: `Submitted ${v.submittedAt ? formatDate(v.submittedAt) : 'recently'} (CNIC ending ${v.idLast4}). Reviews usually take one working day.` },
    rejected: { tone: 'danger', icon: WarningCircleIcon, label: 'Needs attention', text: v.note ? `Reason: ${v.note}` : 'Please upload a clearer photo.' },
    unverified: { tone: 'warning', icon: IdentificationCardIcon, label: 'Not verified', text: 'Customers can only receive offers from verified providers. Upload your CNIC to get started.' },
  }[v.status];

  const showForm = v.status === 'unverified' || v.status === 'rejected' || resubmit;

  return (
    <Card id="verification" className="scroll-mt-28">
      <CardHeader title="Identity verification" action={<Badge tone={status.tone}>{status.label}</Badge>} />
      <InlineAlert tone={status.tone} icon={status.icon}>
        {status.text}
      </InlineAlert>
      {v.status === 'pending' && !resubmit && (
        <button type="button" onClick={() => setResubmit(true)} className="mt-3 min-h-11 text-sm font-semibold text-accent-text hover:underline">
          Upload a different document
        </button>
      )}
      {showForm && (
        <form onSubmit={submit} noValidate className="mt-5 space-y-5">
          <Field label="CNIC number" required error={errors.idNumber} help="We store only the last 4 digits on your profile. The document is visible to admins only.">
            {(pr) => <Input {...pr} inputMode="numeric" autoComplete="off" placeholder="61101-1234567-1" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="sm:max-w-xs" />}
          </Field>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              Photo of your CNIC <span className="text-danger" aria-hidden="true">*</span>
            </p>
            <ImagePicker files={files} onChange={setFiles} max={1} label="Add CNIC photo" help="A clear, well-lit photo of the front. JPG, PNG or WebP up to 5 MB." error={errors.document} />
          </div>
          <Button type="submit" loading={busy} icon={UploadSimpleIcon}>
            Submit for verification
          </Button>
        </form>
      )}
    </Card>
  );
}

export default function EditProfile() {
  useDocumentTitle('My provider profile');
  const { user, setUser } = useAuth();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  // Load the full profile (populated categories) once.
  useEffect(() => {
    api
      .get('/providers/me/profile')
      .then((res) => setUser(res.user))
      .catch(() => {})
      .finally(() => setReady(true));
  }, [setUser]);

  useEffect(() => {
    if (ready && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [ready, location.hash]);

  return (
    <div className="container-page max-w-4xl py-8 sm:py-10">
      <PageHeader
        title="My provider profile"
        description="A complete profile with photos and certifications wins noticeably more jobs."
        actions={
          <ButtonLink to={`/providers/${user.id}`} variant="secondary" icon={EyeIcon}>
            View public profile
          </ButtonLink>
        }
      />
      {ready ? (
        <div className="space-y-6">
          <Verification />
          <ProfileForm />
          <Gallery />
        </div>
      ) : (
        <div className="flex justify-center py-20" role="status">
          <span className="size-8 animate-spin rounded-full border-[3px] border-line border-t-accent" aria-hidden="true" />
          <span className="sr-only">Loading profile…</span>
        </div>
      )}
    </div>
  );
}
