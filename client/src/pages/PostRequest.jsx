import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CrosshairIcon, PaperPlaneTiltIcon, SignInIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ImagePicker } from '../components/ImagePicker.jsx';
import { AddressSearch } from '../components/platform/AddressSearch.jsx';
import { AssistantPanel } from '../components/platform/AssistantPanel.jsx';
import { PriceGuide } from '../components/platform/PriceGuide.jsx';
import { WeatherHint } from '../components/platform/Weather.jsx';
import { LocationPicker } from '../components/LazyMaps.jsx';
import { Button, ButtonLink } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { ChoiceChips, Field, Input, Select, Textarea } from '../components/ui/Field.jsx';
import { PageHeader } from '../components/ui/Nav.jsx';
import { EmptyState, InlineAlert } from '../components/ui/States.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { budgetLabel, URGENCY } from '../lib/format.js';
import { useDocumentTitle } from '../lib/hooks.js';
import { CategoryIcon } from '../lib/icons.jsx';
import { storage } from '../lib/storage.js';

const STEPS = ['The problem', 'Photos and place', 'Timing and budget'];
const DRAFT_KEY = 'requestDraft';

const emptyDraft = (user) => ({
  categoryId: '',
  title: '',
  description: '',
  city: user?.city || 'Islamabad',
  area: user?.area || '',
  address: '',
  lat: null,
  lng: null,
  urgency: 'today',
  preferredDate: '',
  budgetMin: '',
  budgetMax: '',
});

function validateStep(step, d) {
  const e = {};
  if (step === 0) {
    if (!d.categoryId) e.categoryId = 'Choose the type of service you need.';
    if (d.title.trim().length < 5) e.title = 'Write a short title (at least 5 characters).';
    if (d.description.trim().length < 20) e.description = 'Describe the problem in at least 20 characters so providers can price it.';
  }
  if (step === 1) {
    if (!d.city) e.city = 'Choose your city.';
    if (!d.area) e.area = 'Choose your area.';
    if (d.lat === null || d.lng === null) e.map = 'Set your location on the map.';
  }
  if (step === 2) {
    const min = d.budgetMin === '' ? null : Number(d.budgetMin);
    const max = d.budgetMax === '' ? null : Number(d.budgetMax);
    if (min !== null && (Number.isNaN(min) || min < 0)) e.budgetMin = 'Enter a valid amount.';
    if (max !== null && (Number.isNaN(max) || max < 0)) e.budgetMax = 'Enter a valid amount.';
    if (min !== null && max !== null && min > max) e.budgetMax = 'Maximum must be higher than minimum.';
    if (d.preferredDate && new Date(d.preferredDate) < new Date(new Date().toDateString())) e.preferredDate = 'Choose today or a later date.';
  }
  return e;
}

function Progress({ step }) {
  return (
    <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Progress">
      {STEPS.map((label, i) => {
        const state = i < step ? 'done' : i === step ? 'current' : 'todo';
        return (
          <li key={label} aria-current={state === 'current' ? 'step' : undefined}>
            <span className={`block h-1.5 rounded-full transition-colors duration-500 ${state === 'todo' ? 'bg-line' : 'bg-accent'}`} aria-hidden="true" />
            <span className={`mt-2 flex items-center gap-1.5 text-xs font-semibold sm:text-sm ${state === 'todo' ? 'text-muted' : 'text-ink'}`}>
              {state === 'done' && <CheckIcon size={14} weight="bold" className="text-success" aria-hidden="true" />}
              <span className="sr-only">{state === 'done' ? 'Completed: ' : state === 'current' ? 'Current: ' : 'Next: '}</span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function PostRequest() {
  useDocumentTitle('Post a request');
  const { user, ready } = useAuth();
  const { categories, cities, areasFor, categoryById, loaded } = useAppData();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => ({ ...emptyDraft(user), ...storage.get(DRAFT_KEY, {}) }));
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  // Pre-select a category from ?category=slug (links from the home page and tips).
  useEffect(() => {
    const slug = params.get('category');
    if (slug && loaded && !draft.categoryId) {
      const c = categories.find((x) => x.slug === slug);
      if (c) setDraft((d) => ({ ...d, categoryId: c.id }));
    }
  }, [params, loaded, categories, draft.categoryId]);

  // Draft autosave (text fields only; photos cannot be stored in localStorage).
  useEffect(() => {
    storage.set(DRAFT_KEY, draft);
  }, [draft]);

  // Default the pin to the centre of the chosen area.
  const areas = useMemo(() => areasFor(draft.city), [areasFor, draft.city]);
  useEffect(() => {
    if (!draft.area || draft.lat !== null) return;
    const a = areas.find((x) => x.name === draft.area);
    if (a) setDraft((d) => ({ ...d, lat: a.lat, lng: a.lng }));
  }, [draft.area, draft.lat, areas]);

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  // Fills the form from the assistant's suggestion. The customer's own words become the description.
  const applySuggestion = (s) => {
    setDraft((d) => ({
      ...d,
      categoryId: s.category?.id || d.categoryId,
      title: s.title.slice(0, 100),
      description: d.description.trim().length >= 20 ? d.description : s.text.slice(0, 2000),
      urgency: s.urgency,
    }));
    setErrors({});
    toast.success('Details filled in. Add anything providers should know, then continue.');
  };

  // A place picked from address search, or found by GPS: move the pin and fill city, area and address.
  const applyPlace = ({ lat, lng, address, match }) => {
    setDraft((d) => ({
      ...d,
      lat,
      lng,
      ...(match ? { city: match.city, area: match.area } : {}),
      address: d.address.trim() ? d.address : (address || '').slice(0, 200),
    }));
    setErrors((e) => ({ ...e, map: undefined, area: undefined, city: undefined }));
    if (!match) toast.info('That spot is outside our current service area (Islamabad and Rawalpindi). Choose the nearest area below.');
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Your browser does not support location.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 1e6) / 1e6;
        const lng = Math.round(pos.coords.longitude * 1e6) / 1e6;
        try {
          // Reverse geocoding (OpenStreetMap Nominatim via our API) turns the GPS fix into an address.
          const place = await api.get('/geo/reverse', { lat, lng });
          applyPlace({ lat, lng, address: place.address, match: place.match });
        } catch {
          setDraft((d) => ({ ...d, lat, lng })); // the pin still moves if the address lookup is down
        }
        setLocating(false);
      },
      () => {
        toast.error('Could not get your location. Tap the map instead.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const next = () => {
    const e = validateStep(step, draft);
    setErrors(e);
    if (Object.keys(e).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    const all = { ...validateStep(0, draft), ...validateStep(1, draft), ...validateStep(2, draft) };
    setErrors(all);
    if (Object.keys(all).length) {
      setStep(Object.keys(validateStep(0, draft)).length ? 0 : Object.keys(validateStep(1, draft)).length ? 1 : 2);
      return;
    }
    setBusy(true);
    setServerError('');
    try {
      const data = {
        categoryId: draft.categoryId,
        title: draft.title.trim(),
        description: draft.description.trim(),
        city: draft.city,
        area: draft.area,
        address: draft.address.trim(),
        lat: draft.lat,
        lng: draft.lng,
        urgency: draft.urgency,
        ...(draft.preferredDate ? { preferredDate: draft.preferredDate } : {}),
        ...(draft.budgetMin !== '' ? { budgetMin: Number(draft.budgetMin) } : {}),
        ...(draft.budgetMax !== '' ? { budgetMax: Number(draft.budgetMax) } : {}),
      };
      const res = await api.upload('/requests', { data, files: { images: files } });
      storage.remove(DRAFT_KEY);
      toast.success('Your request is live. Matching providers have been notified.');
      navigate(`/requests/${res.request.id}`, { replace: true });
    } catch (err) {
      setServerError(err.message);
      if (err.fields) setErrors(err.fields);
    } finally {
      setBusy(false);
    }
  };

  if (ready && user && user.role !== 'customer') {
    return (
      <div className="container-page py-12">
        <EmptyState
          title="Posting is for customer accounts"
          description="You are signed in as a provider or admin. Providers find work on the requests page."
          action={<ButtonLink to={user.role === 'provider' ? '/provider/requests' : '/admin'}>Go to my area</ButtonLink>}
        />
      </div>
    );
  }

  const category = categoryById(draft.categoryId);

  return (
    <div className="container-page max-w-4xl py-8 sm:py-12">
      <PageHeader title="Post a request" description="Three short steps. Verified providers nearby will send you offers, usually within the hour." />
      <Progress step={step} />

      {!user && ready && (
        <div className="mb-6">
          <InlineAlert
            tone="accent"
            icon={SignInIcon}
            title="You can fill this in now"
            action={
              <ButtonLink to="/login?next=/post-request" size="sm" variant="secondary">
                Log in
              </ButtonLink>
            }
          >
            Your draft is saved on this device. Log in or create a free account to post it.
          </InlineAlert>
        </div>
      )}

      <Card className="sm:p-8">
        {step === 0 && (
          <div className="space-y-6">
            <AssistantPanel initialText={draft.description} onApply={applySuggestion} />
            <fieldset aria-describedby={errors.categoryId ? 'cat-error' : undefined}>
              <legend className="mb-3 text-sm font-semibold text-ink">
                What do you need? <span className="text-danger" aria-hidden="true">*</span>
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {categories.map((c) => {
                  const checked = draft.categoryId === c.id;
                  return (
                    <label
                      key={c.id}
                      className={`flex min-h-24 cursor-pointer flex-col items-start justify-between gap-2 rounded-2xl border p-3 text-sm font-semibold transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--accent-ring)] ${
                        checked ? 'border-accent bg-accent-soft text-accent-text' : 'border-line-strong text-ink-2 hover:border-ink/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={c.id}
                        checked={checked}
                        onChange={() => setDraft((d) => ({ ...d, categoryId: c.id }))}
                        className="sr-only"
                        aria-invalid={errors.categoryId ? true : undefined}
                      />
                      <CategoryIcon name={c.icon} size={24} />
                      {c.name}
                    </label>
                  );
                })}
              </div>
              {errors.categoryId && (
                <p id="cat-error" className="mt-2 text-[0.82rem] font-medium text-danger" role="alert">
                  {errors.categoryId}
                </p>
              )}
            </fieldset>
            <Field label="Title" required error={errors.title} help="For example: Kitchen sink pipe leaking under the cabinet">
              {(p) => <Input {...p} maxLength={100} value={draft.title} onChange={set('title')} />}
            </Field>
            <Field
              label="Describe the problem"
              required
              error={errors.description}
              help={`Include the brand or model, when it started and what you have tried. ${draft.description.trim().length}/2000`}
            >
              {(p) => <Textarea {...p} rows={6} maxLength={2000} value={draft.description} onChange={set('description')} />}
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">
                Photos <span className="font-normal text-muted">(optional, but they help providers price accurately)</span>
              </p>
              <ImagePicker files={files} onChange={setFiles} max={5} error={errors.images} />
            </div>
            <AddressSearch onPick={applyPlace} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="City" required error={errors.city}>
                {(p) => (
                  <Select {...p} value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value, area: '', lat: null, lng: null }))}>
                    {cities.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Area" required error={errors.area}>
                {(p) => (
                  <Select {...p} value={draft.area} onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value, lat: null, lng: null }))}>
                    <option value="">Choose your area</option>
                    {areas.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <Field label="House address" optional help="Only the provider you hire will see this. Others see your area only.">
              {(p) => <Input {...p} autoComplete="street-address" maxLength={200} value={draft.address} onChange={set('address')} placeholder="House 12, Street 7" />}
            </Field>
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">Pin your location</p>
                <Button variant="ghost" size="sm" icon={CrosshairIcon} onClick={useMyLocation} loading={locating}>
                  Use my location
                </Button>
              </div>
              {draft.lat !== null ? (
                <LocationPicker value={{ lat: draft.lat, lng: draft.lng }} onChange={(ll) => setDraft((d) => ({ ...d, ...ll }))} />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-card border border-dashed border-line-strong bg-surface-2 px-6 text-center text-sm text-muted">
                  Choose your area first, then tap the map or drag the pin to your exact spot.
                </div>
              )}
              {errors.map && (
                <p className="mt-2 text-[0.82rem] font-medium text-danger" role="alert">
                  {errors.map}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <ChoiceChips
              legend="How soon do you need it?"
              name="urgency"
              value={draft.urgency}
              onChange={(v) => setDraft((d) => ({ ...d, urgency: v }))}
              options={Object.entries(URGENCY).map(([value, u]) => ({ value, label: u.label }))}
            />
            <Field label="Preferred date" optional error={errors.preferredDate}>
              {(p) => <Input {...p} type="date" min={new Date().toISOString().slice(0, 10)} value={draft.preferredDate} onChange={set('preferredDate')} className="sm:max-w-xs" />}
            </Field>
            <WeatherHint lat={draft.lat} lng={draft.lng} date={draft.preferredDate} categorySlug={category?.slug} />
            <div>
              <p className="text-sm font-semibold text-ink">
                Budget <span className="font-normal text-muted">(optional, in rupees)</span>
              </p>
              <p className="text-[0.82rem] text-muted">Leave empty to let providers suggest a price.</p>
              <div className="mt-3">
                <PriceGuide categorySlug={category?.slug} onUse={(low, high) => setDraft((d) => ({ ...d, budgetMin: String(low), budgetMax: String(high) }))} />
              </div>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <Field label="Minimum" error={errors.budgetMin}>
                  {(p) => <Input {...p} type="number" inputMode="numeric" min="0" step="100" value={draft.budgetMin} onChange={set('budgetMin')} placeholder="1000" />}
                </Field>
                <Field label="Maximum" error={errors.budgetMax}>
                  {(p) => <Input {...p} type="number" inputMode="numeric" min="0" step="100" value={draft.budgetMax} onChange={set('budgetMax')} placeholder="3000" />}
                </Field>
              </div>
            </div>

            <section aria-labelledby="summary-heading" className="rounded-2xl bg-surface-2 p-5">
              <h2 id="summary-heading" className="font-bold text-ink">
                Check before posting
              </h2>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Service</dt>
                  <dd className="font-semibold text-ink">{category?.name || 'Not chosen'}</dd>
                </div>
                <div>
                  <dt className="text-muted">Where</dt>
                  <dd className="font-semibold text-ink">{draft.area ? `${draft.area}, ${draft.city}` : 'Not set'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted">Title</dt>
                  <dd className="font-semibold text-ink">{draft.title || 'Not written'}</dd>
                </div>
                <div>
                  <dt className="text-muted">Photos</dt>
                  <dd className="font-semibold text-ink">{files.length}</dd>
                </div>
                <div>
                  <dt className="text-muted">Budget</dt>
                  <dd className="font-semibold text-ink">
                    {budgetLabel(draft.budgetMin || draft.budgetMax ? { min: Number(draft.budgetMin) || null, max: Number(draft.budgetMax) || null } : null)}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        )}

        {serverError && (
          <div className="mt-6">
            <InlineAlert tone="danger" title="Could not post your request">
              {serverError}
            </InlineAlert>
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? (
            <Button variant="ghost" icon={ArrowLeftIcon} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : (
            <button
              type="button"
              className="min-h-11 text-sm font-semibold text-muted hover:text-ink"
              onClick={() => {
                setDraft(emptyDraft(user));
                setFiles([]);
                setErrors({});
              }}
            >
              Clear form
            </button>
          )}
          {step < 2 ? (
            <Button onClick={next} trailingIcon={ArrowRightIcon} size="lg">
              Continue
            </Button>
          ) : user ? (
            <Button onClick={submit} loading={busy} icon={PaperPlaneTiltIcon} size="lg">
              Post request
            </Button>
          ) : (
            <ButtonLink to="/login?next=/post-request" icon={SignInIcon} size="lg">
              Log in to post
            </ButtonLink>
          )}
        </div>
      </Card>
      <p className="mt-4 text-center text-xs text-muted">
        Draft saved on this device.{' '}
        <Link to="/how-it-works" className="font-semibold underline">
          How does it work?
        </Link>
      </p>
    </div>
  );
}
