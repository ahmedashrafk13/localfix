import { ArrowBendDownRightIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/format.js';
import { ReportButton } from './ReportDialog.jsx';
import { Avatar } from './ui/Avatar.jsx';
import { Button } from './ui/Button.jsx';
import { Field, Textarea } from './ui/Field.jsx';
import { Stars } from './ui/Stars.jsx';

export function ReviewCard({ review: r, canReply, canReport, onUpdated }) {
  const toast = useToast();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submitReply = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.post(`/reviews/${r.id}/reply`, { text });
      toast.success('Your reply is published.');
      setReplying(false);
      onUpdated?.(res.review);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <Avatar src={r.customer?.avatar} name={r.customer?.name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="text-sm font-semibold text-ink">
              {r.customer?.name}
              {r.customer?.city && <span className="font-normal text-muted">, {r.customer.city}</span>}
            </p>
            <time className="text-xs text-muted" dateTime={r.createdAt}>
              {formatDate(r.createdAt)}
            </time>
          </div>
          <Stars value={r.rating} size={14} className="mt-0.5" />
          {r.request?.title && <p className="mt-1 text-xs font-medium text-muted">Job: {r.request.title}</p>}
          {r.comment && <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">{r.comment}</p>}
          {r.reply && (
            <div className="mt-3 flex gap-2 rounded-2xl bg-surface-3 p-3 text-sm">
              <ArrowBendDownRightIcon size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
              <div>
                <p className="font-semibold text-ink">Provider reply</p>
                <p className="text-ink-2">{r.reply.text}</p>
              </div>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {canReply && !r.reply && !replying && (
              <Button variant="ghost" size="sm" onClick={() => setReplying(true)}>
                Reply publicly
              </Button>
            )}
            {canReport && <ReportButton targetType="review" targetId={r.id} label="Report review" />}
          </div>
          {replying && (
            <form onSubmit={submitReply} className="mt-3 space-y-3">
              <Field label="Your public reply" error={error}>
                {(p) => <Textarea {...p} rows={3} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} placeholder="Thank the customer or add context." />}
              </Field>
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={busy} disabled={text.trim().length < 2}>
                  Publish reply
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setReplying(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
