import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  CalendarPlusIcon,
  ChatCircleDotsIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  HandshakeIcon,
  MapPinIcon,
  PencilSimpleIcon,
  PhoneIcon,
  ShieldCheckIcon,
  ShareNetworkIcon,
  SignInIcon,
  WarningIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { LocationMap } from '../components/LazyMaps.jsx';
import { OfferComparison } from '../components/OfferComparison.jsx';
import { OfferForm } from '../components/OfferForm.jsx';
import { TravelCard } from '../components/platform/TravelCard.jsx';
import { WeatherCard } from '../components/platform/Weather.jsx';
import { ReportButton } from '../components/ReportDialog.jsx';
import { ReviewCard } from '../components/ReviewCard.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { OfferStatusBadge, RequestStatusBadge, UrgencyBadge, VerifiedBadge } from '../components/ui/Badge.jsx';
import { Button, ButtonLink } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { ChoiceChips, Field, Input, Textarea } from '../components/ui/Field.jsx';
import { ImageGallery } from '../components/ui/Lightbox.jsx';
import { ConfirmDialog, Modal } from '../components/ui/Modal.jsx';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '../components/ui/States.jsx';
import { StarInput, Stars } from '../components/ui/Stars.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocketEvent } from '../context/RealtimeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { budgetLabel, eta, formatDate, formatDateTime, memberSince, pkr, timeAgo, URGENCY } from '../lib/format.js';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { CategoryIcon } from '../lib/icons.jsx';

function Timeline({ r }) {
  const steps = [
    { label: 'Posted', at: r.createdAt, done: true },
    { label: r.offerCount ? `${r.offerCount} offer${r.offerCount === 1 ? '' : 's'}` : 'Offers', at: null, done: r.offerCount > 0 || r.status !== 'open' },
    { label: 'Provider hired', at: r.assignedAt, done: Boolean(r.assignedAt) },
    { label: 'Completed', at: r.completedAt, done: r.status === 'completed' },
  ];
  if (r.status === 'cancelled') {
    return (
      <InlineAlert tone="warning" icon={XCircleIcon} title={`Cancelled ${timeAgo(r.cancelledAt)}`}>
        {r.cancelReason || 'This request is no longer active.'}
      </InlineAlert>
    );
  }
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Request progress">
      {steps.map((s) => (
        <li key={s.label} className="min-w-0">
          <span className={`block h-1.5 rounded-full ${s.done ? 'bg-accent' : 'bg-line'}`} aria-hidden="true" />
          <span className={`mt-2 flex items-center gap-1 text-xs font-semibold sm:text-sm ${s.done ? 'text-ink' : 'text-muted'}`}>
            {s.done && <CheckCircleIcon size={14} weight="fill" className="shrink-0 text-success" aria-hidden="true" />}
            <span className="truncate">{s.label}</span>
            <span className="sr-only">{s.done ? ', done' : ', not yet'}</span>
          </span>
          {s.at && <span className="block truncate text-xs text-muted">{formatDateTime(s.at)}</span>}
        </li>
      ))}
    </ol>
  );
}

function EditRequestModal({ open, onClose, request, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: request.title,
    description: request.description,
    address: request.location.address || '',
    urgency: request.urgency,
    budgetMin: request.budget?.min ?? '',
    budgetMax: request.budget?.max ?? '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const res = await api.patch(`/requests/${request.id}`, {
        title: form.title,
        description: form.description,
        address: form.address,
        urgency: form.urgency,
        budgetMin: form.budgetMin === '' ? null : Number(form.budgetMin),
        budgetMax: form.budgetMax === '' ? null : Number(form.budgetMax),
      });
      toast.success('Request updated.');
      onSaved(res.request);
      onClose();
    } catch (err) {
      setErrors(err.fields || { _: err.message });
      if (!err.fields) toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit request"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Title" required error={errors.title}>
          {(p) => <Input {...p} maxLength={100} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />}
        </Field>
        <Field label="Description" required error={errors.description}>
          {(p) => <Textarea {...p} rows={5} maxLength={2000} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />}
        </Field>
        <Field label="House address" optional help="Only shared with the provider you hire." error={errors.address}>
          {(p) => <Input {...p} maxLength={200} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />}
        </Field>
        <ChoiceChips
          legend="Urgency"
          name="edit-urgency"
          value={form.urgency}
          onChange={(v) => setForm((f) => ({ ...f, urgency: v }))}
          options={Object.entries(URGENCY).map(([value, u]) => ({ value, label: u.label }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Budget minimum (Rs)" error={errors.budgetMin}>
            {(p) => <Input {...p} type="number" min="0" value={form.budgetMin} onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))} />}
          </Field>
          <Field label="Budget maximum (Rs)" error={errors.budgetMax}>
            {(p) => <Input {...p} type="number" min="0" value={form.budgetMax} onChange={(e) => setForm((f) => ({ ...f, budgetMax: e.target.value }))} />}
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function ReviewForm({ request, onDone }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Choose a star rating.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post(`/requests/${request.id}/review`, { rating, comment });
      toast.success('Thanks for your review. It helps your neighbours choose well.');
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <StarInput value={rating} onChange={setRating} />
      <Field label="Tell others about the job" optional help="Was the provider on time? Was the price fair? Was the work tidy?">
        {(p) => <Textarea {...p} rows={4} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />}
      </Field>
      {error && (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" loading={busy}>
        Publish review
      </Button>
    </form>
  );
}

/** What the customer who posted the request sees. */
function OwnerPanel({ r, reload, offersKey }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [confirmDone, setConfirmDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const p = r.assignedProvider;

  const complete = async () => {
    setBusy(true);
    try {
      await api.post(`/requests/${r.id}/complete`);
      toast.success('Marked as completed. Please leave a review.');
      setConfirmDone(false);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const chat = async () => {
    try {
      const res = await api.post('/conversations', { requestId: r.id, providerId: p.id });
      navigate(`/messages/${res.conversation.id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (r.status === 'open') return <OfferComparison request={r} onAccepted={reload} reloadKey={offersKey} />;

  if ((r.status === 'assigned' || r.status === 'completed') && p) {
    return (
      <div className="space-y-6">
        {r.status === 'assigned' && r.providerMarkedDoneAt && (
          <InlineAlert
            tone="success"
            icon={CheckCircleIcon}
            title={`${p.name} marked the job as done ${timeAgo(r.providerMarkedDoneAt)}`}
            action={
              <Button variant="success" onClick={() => setConfirmDone(true)}>
                Confirm completion
              </Button>
            }
          >
            Check the work, then confirm so you can leave a review.
          </InlineAlert>
        )}
        <Card>
          <CardHeader title={r.status === 'completed' ? 'Completed by' : 'Your provider'} description={r.status === 'assigned' ? `Hired ${timeAgo(r.assignedAt)}` : `Completed ${formatDate(r.completedAt)}`} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Avatar src={p.avatar} name={p.name} size="lg" />
              <div>
                <p className="flex items-center gap-1.5 text-lg font-bold text-ink">
                  <Link to={`/providers/${p.id}`} className="hover:underline">
                    {p.name}
                  </Link>
                  {p.verified && <VerifiedBadge compact />}
                </p>
                <Stars value={p.ratingAvg} showValue count={p.ratingCount} size={14} />
                {p.phone && (
                  <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text hover:underline">
                    <PhoneIcon size={16} aria-hidden="true" />
                    {p.phone}
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={ChatCircleDotsIcon} onClick={chat}>
                Message
              </Button>
              {r.status === 'assigned' && <CalendarLink requestId={r.id} />}
              {r.status === 'assigned' && !r.providerMarkedDoneAt && (
                <Button variant="success" icon={CheckCircleIcon} onClick={() => setConfirmDone(true)}>
                  Job is done
                </Button>
              )}
            </div>
          </div>
        </Card>
        {r.status === 'completed' && (
          <Card id="review">
            {r.review ? (
              <>
                <CardHeader title="Your review" />
                <ReviewCard review={r.review} />
              </>
            ) : (
              <>
                <CardHeader title={`How did ${p.name.split(' ')[0]} do?`} description="Your review is public and can only be written once." />
                <ReviewForm request={r} onDone={reload} />
              </>
            )}
          </Card>
        )}
        <ConfirmDialog
          open={confirmDone}
          onClose={() => setConfirmDone(false)}
          onConfirm={complete}
          busy={busy}
          tone="success"
          title="Confirm the job is complete?"
          description={`This closes the request and lets you review ${p.name}.`}
          confirmLabel="Yes, it is complete"
        />
      </div>
    );
  }
  return null;
}

/** What a provider sees: send, edit or withdraw an offer, or manage the job once hired. */
function ProviderPanel({ r, reload }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [marking, setMarking] = useState(false);
  const offer = r.myOffer;
  const verified = user.provider?.verification?.status === 'verified';
  const hired = r.viewer.isAssigned;

  const openChat = async () => {
    if (r.conversationId) return navigate(`/messages/${r.conversationId}`);
    try {
      const res = await api.post('/conversations', { requestId: r.id });
      navigate(`/messages/${res.conversation.id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const send = async (data) => {
    setBusy(true);
    try {
      if (offer && offer.status === 'pending') {
        await api.patch(`/offers/${offer.id}`, data);
        toast.success('Offer updated. The customer has been notified.');
      } else {
        await api.post(`/requests/${r.id}/offers`, data);
        toast.success('Offer sent. You will be notified when the customer responds.');
      }
      setEditing(false);
      reload();
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    try {
      await api.post(`/offers/${offer.id}/withdraw`);
      toast.success('Offer withdrawn.');
      setWithdrawing(false);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const markDone = async () => {
    setBusy(true);
    try {
      await api.post(`/requests/${r.id}/mark-done`);
      toast.success('The customer has been asked to confirm completion.');
      setMarking(false);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (hired) {
    return (
      <Card className="border-success/40">
        <div className="flex items-start gap-3">
          <HandshakeIcon size={28} className="shrink-0 text-success" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-ink">{r.status === 'completed' ? 'Job completed' : 'You got this job'}</h2>
            <p className="mt-1 text-sm text-ink-2">
              Agreed price <strong>{pkr(offer?.price)}</strong>
              {offer ? `, arrival within ${eta(offer.etaMinutes)}` : ''}.
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Customer</dt>
                <dd className="font-semibold text-ink">{r.customer.name}</dd>
              </div>
              {r.customer.phone && (
                <div>
                  <dt className="text-muted">Phone</dt>
                  <dd>
                    <a href={`tel:${r.customer.phone.replace(/\s/g, '')}`} className="font-semibold text-accent-text hover:underline">
                      {r.customer.phone}
                    </a>
                  </dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-muted">Address</dt>
                <dd className="font-semibold text-ink">{r.location.address || `${r.location.area}, ${r.location.city} (ask the customer for the house number)`}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="secondary" icon={ChatCircleDotsIcon} onClick={openChat}>
                Message customer
              </Button>
              {r.status === 'assigned' && <CalendarLink requestId={r.id} />}
              {r.status === 'assigned' &&
                (r.providerMarkedDoneAt ? (
                  <p className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-success">
                    <CheckCircleIcon size={18} weight="fill" aria-hidden="true" /> Marked done, waiting for the customer
                  </p>
                ) : (
                  <Button variant="success" icon={CheckCircleIcon} onClick={() => setMarking(true)}>
                    Mark job as done
                  </Button>
                ))}
            </div>
          </div>
        </div>
        <ConfirmDialog
          open={marking}
          onClose={() => setMarking(false)}
          onConfirm={markDone}
          busy={busy}
          tone="success"
          title="Mark this job as done?"
          description="The customer will be asked to confirm. Once they do, the job counts towards your record."
          confirmLabel="Mark as done"
        />
      </Card>
    );
  }

  if (offer && offer.status !== 'withdrawn' && !editing) {
    return (
      <Card>
        <CardHeader title="Your offer" action={<OfferStatusBadge status={offer.status} />} />
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="font-display text-3xl font-bold text-ink">{pkr(offer.price)}</p>
          <p className="text-sm font-semibold text-ink-2">Arrival within {eta(offer.etaMinutes)}</p>
        </div>
        <p className="mt-3 text-ink-2">{offer.details}</p>
        <p className="mt-2 text-xs text-muted">
          {offer.warrantyDays ? `${offer.warrantyDays}-day warranty. ` : ''}
          {offer.includesMaterials ? 'Materials included. ' : ''}
          Sent {timeAgo(offer.createdAt)}
          {offer.history.length > 1 ? `, edited ${offer.history.length - 1} time${offer.history.length > 2 ? 's' : ''}` : ''}.
        </p>
        {offer.status === 'pending' && r.status === 'open' && (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="secondary" icon={PencilSimpleIcon} onClick={() => setEditing(true)}>
              Edit offer
            </Button>
            <Button variant="secondary" icon={ChatCircleDotsIcon} onClick={openChat}>
              Message customer
            </Button>
            <Button variant="danger-ghost" onClick={() => setWithdrawing(true)}>
              Withdraw
            </Button>
          </div>
        )}
        {offer.status === 'rejected' && <p className="mt-4 text-sm text-muted">The customer chose another provider for this job. New requests are waiting in Find work.</p>}
        <ConfirmDialog
          open={withdrawing}
          onClose={() => setWithdrawing(false)}
          onConfirm={withdraw}
          busy={busy}
          tone="danger"
          title="Withdraw your offer?"
          description="The customer will no longer see it. You can send a new offer while the request is open."
          confirmLabel="Withdraw offer"
        />
      </Card>
    );
  }

  if (r.status !== 'open') {
    return <EmptyState icon={ClockIcon} title="This request is closed" description="It is no longer accepting offers." action={<ButtonLink to="/provider/requests">Find other work</ButtonLink>} />;
  }

  return (
    <Card>
      <CardHeader
        title={editing ? 'Edit your offer' : 'Send your offer'}
        description="A clear price, a realistic arrival time and what is included win the most jobs."
        action={
          verified && !editing ? (
            <Button variant="ghost" size="sm" icon={ChatCircleDotsIcon} onClick={openChat}>
              Ask a question first
            </Button>
          ) : null
        }
      />
      {verified ? (
        <OfferForm categorySlug={r.category?.slug} initial={editing ? offer : undefined} onSubmit={send} onCancel={editing ? () => setEditing(false) : undefined} submitLabel={editing ? 'Save changes' : 'Send offer'} busy={busy} />
      ) : (
        <InlineAlert tone="warning" icon={ShieldCheckIcon} title="Verification required" action={<ButtonLink to="/provider/profile#verification" size="sm" variant="secondary">Verify now</ButtonLink>}>
          {user.provider?.verification?.status === 'pending'
            ? 'Your documents are being reviewed. You can send offers as soon as you are verified.'
            : 'Upload your CNIC so our team can verify you. Then you can send offers.'}
        </InlineAlert>
      )}
    </Card>
  );
}

/** Downloads the booked job as an .ics file (GET /api/requests/:id/calendar.ics) for any calendar app. */
function CalendarLink({ requestId }) {
  return (
    <a
      href={`/api/requests/${requestId}/calendar.ics`}
      download
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-5 text-[0.95rem] font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-surface-2"
    >
      <CalendarPlusIcon size={18} weight="bold" aria-hidden="true" />
      Add to calendar
    </a>
  );
}

function DetailsSkeleton() {
  return (
    <div className="container-page py-8" role="status" aria-label="Loading request…">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-4 h-10 w-2/3" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
        <Skeleton className="h-80 w-full rounded-card" />
      </div>
    </div>
  );
}

export default function RequestDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi(`/requests/${id}`);
  const [offersKey, setOffersKey] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [travel, setTravel] = useState(null);
  const r = data?.request;
  useDocumentTitle(r ? r.title : 'Request');

  // Web Share API on phones, clipboard everywhere else.
  const share = async () => {
    const payload = { title: `LocalFix: ${r.title}`, text: `${r.category?.name || 'Repair'} job in ${r.location.area}, ${r.location.city}`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(payload.url);
        toast.success('Link copied. Paste it anywhere to share this request.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') toast.error('Could not share this request.');
    }
  };

  const refreshAll = useCallback(() => {
    reload();
    setOffersKey((k) => k + 1);
  }, [reload]);

  useSocketEvent('offer:new', (p) => {
    if (p.requestId === id) refreshAll();
  });
  useSocketEvent('request:updated', (p) => {
    if (p.id === id) refreshAll();
  });

  const cancel = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/requests/${id}/cancel`, { reason: cancelReason });
      setData({ request: res.request });
      toast.success('Request cancelled. Providers who sent offers have been told.');
      setCancelOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <DetailsSkeleton />;
  if (error) {
    return (
      <div className="container-page py-12">
        {error.status === 404 ? (
          <EmptyState icon={WarningIcon} title="Request not found" description="It may have been cancelled, completed or removed." action={<ButtonLink to="/requests">Browse open requests</ButtonLink>} />
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )}
      </div>
    );
  }
  if (!r) return null;

  const isOwner = r.viewer.isOwner;
  const isProvider = user?.role === 'provider';
  const privileged = isOwner || r.viewer.isAssigned || r.viewer.isAdmin;

  return (
    <div className="container-page py-6 sm:py-8">
      <Link to={isOwner ? '/customer/requests' : isProvider ? '/provider/requests' : '/requests'} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeftIcon size={16} aria-hidden="true" />
        {isOwner ? 'My requests' : isProvider ? 'Find work' : 'All requests'}
      </Link>

      <header className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text">
              <CategoryIcon name={r.category?.icon} size={16} />
              {r.category?.name}
            </span>
            <RequestStatusBadge status={r.status} />
            <UrgencyBadge urgency={r.urgency} />
            {r.removed && <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-bold text-danger">Removed by moderator</span>}
          </div>
          <h1 className="mt-2 text-[1.8rem] font-bold leading-tight text-ink sm:text-4xl">{r.title}</h1>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPinIcon size={16} aria-hidden="true" />
              {r.location.area}, {r.location.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <ClockIcon size={16} aria-hidden="true" />
              Posted {timeAgo(r.createdAt)}
            </span>
            {isOwner && (
              <span className="inline-flex items-center gap-1">
                <EyeIcon size={16} aria-hidden="true" />
                Viewed by {r.views} provider{r.views === 1 ? '' : 's'}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {isOwner && r.status === 'open' && (
            <Button variant="secondary" icon={PencilSimpleIcon} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          )}
          {isOwner && ['open', 'assigned'].includes(r.status) && (
            <Button variant="danger-ghost" onClick={() => setCancelOpen(true)}>
              Cancel request
            </Button>
          )}
          {r.status === 'open' && !r.removed && (
            <Button variant="ghost" icon={ShareNetworkIcon} onClick={share}>
              Share
            </Button>
          )}
          {user && !isOwner && <ReportButton targetType="request" targetId={r.id} label="Report" />}
        </div>
      </header>

      <div className="mt-6">
        <Timeline r={r} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-8">
          <Card>
            <h2 className="sr-only">Details</h2>
            <p className="whitespace-pre-line text-[1.02rem] leading-relaxed text-ink-2">{r.description}</p>
            <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted">Budget</dt>
                <dd className="font-semibold text-ink">{budgetLabel(r.budget)}</dd>
              </div>
              <div>
                <dt className="text-muted">Needed</dt>
                <dd className="font-semibold text-ink">{URGENCY[r.urgency]?.hint}</dd>
              </div>
              <div>
                <dt className="text-muted">Preferred date</dt>
                <dd className="inline-flex items-center gap-1 font-semibold text-ink">
                  <CalendarBlankIcon size={15} aria-hidden="true" />
                  {r.preferredDate ? formatDate(r.preferredDate) : 'Any'}
                </dd>
              </div>
            </dl>
            {r.images.length > 0 && <ImageGallery images={r.images} alt={`Photo of ${r.title}`} className="mt-5 grid-cols-2 sm:grid-cols-3" />}
          </Card>

          {isOwner && <OwnerPanel r={r} reload={refreshAll} offersKey={offersKey} />}
          {isProvider && !isOwner && <ProviderPanel r={r} reload={refreshAll} />}
          {!user && r.status === 'open' && (
            <InlineAlert
              tone="accent"
              icon={SignInIcon}
              title="Are you a provider?"
              action={
                <ButtonLink to={`/login?next=/requests/${r.id}`} size="sm">
                  Log in to send an offer
                </ButtonLink>
              }
            >
              Verified providers can send a price and arrival time on this request.
            </InlineAlert>
          )}
          {user?.role === 'customer' && !isOwner && (
            <InlineAlert tone="info" title="Need something similar?" action={<ButtonLink to={`/post-request?category=${r.category?.slug}`} size="sm" variant="secondary">Post your own request</ButtonLink>}>
              Only providers can send offers on other people's requests.
            </InlineAlert>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <Card padded={false} className="overflow-hidden">
            <LocationMap
              lat={r.location.lat}
              lng={r.location.lng}
              approximate={r.location.approximate}
              route={travel?.route.geometry}
              origin={travel?.from}
              className="h-56 rounded-none border-0"
            />
            <div className="p-5">
              <h2 className="font-bold text-ink">Location</h2>
              {privileged && r.location.address ? (
                <p className="mt-1 text-sm text-ink-2">{r.location.address}</p>
              ) : (
                <p className="mt-1 text-sm text-ink-2">
                  {r.location.area}, {r.location.city}
                </p>
              )}
              {r.location.approximate && <p className="mt-2 text-xs text-muted">The circle shows the area only. The exact address is shared with the hired provider.</p>}
            </div>
          </Card>

          {isProvider && !isOwner && ['open', 'assigned'].includes(r.status) && (
            <TravelCard request={r} hasProfileLocation={Boolean(user.provider?.location)} onRoute={(route, from) => setTravel({ route, from })} />
          )}

          {['open', 'assigned'].includes(r.status) && <WeatherCard requestId={r.id} />}

          {!isOwner && (
            <Card>
              <h2 className="font-bold text-ink">Posted by</h2>
              <div className="mt-3 flex items-center gap-3">
                <Avatar src={r.customer.avatar} name={r.customer.name} size="md" />
                <div>
                  <p className="font-semibold text-ink">{r.customer.name}</p>
                  {r.customer.memberSince && <p className="text-xs text-muted">Member since {memberSince(r.customer.memberSince)}</p>}
                </div>
              </div>
            </Card>
          )}

          <Card className="bg-surface-2">
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <ShieldCheckIcon size={20} className="text-success" aria-hidden="true" />
              Stay safe
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-2">
              <li>Keep conversations in LocalFix chat so there is a record.</li>
              <li>Agree the price before work starts.</li>
              <li>Never send a large advance payment.</li>
              <li>Report anything that does not feel right.</li>
            </ul>
            <Link to="/safety" className="mt-3 inline-block text-sm font-semibold text-accent-text hover:underline">
              Safety guide
            </Link>
          </Card>
        </aside>
      </div>

      {isOwner && r.status === 'open' && editOpen && (
        <EditRequestModal open={editOpen} onClose={() => setEditOpen(false)} request={r} onSaved={(req) => setData((d) => ({ ...d, request: { ...d.request, ...req } }))} />
      )}
      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancel}
        busy={busy}
        tone="danger"
        title="Cancel this request?"
        description="Providers who sent offers will be notified. This cannot be undone."
        confirmLabel="Cancel request"
      >
        <Field label="Reason" optional help="Shared with providers who made an offer.">
          {(p) => <Input {...p} maxLength={300} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="For example: fixed it myself" />}
        </Field>
      </ConfirmDialog>
    </div>
  );
}
