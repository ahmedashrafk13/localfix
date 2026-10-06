import { ArrowSquareOutIcon, ArticleIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ImagePicker } from '../../components/ImagePicker.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Input, Select, Textarea, Toggle } from '../../components/ui/Field.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx';
import { PageHeader } from '../../components/ui/Nav.jsx';
import { CardListSkeleton, EmptyState, ErrorState } from '../../components/ui/States.jsx';
import { useAppData } from '../../context/AppDataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';

const EMPTY = { title: '', excerpt: '', body: '', categoryId: '', published: true };

export default function Tips() {
  useDocumentTitle('Maintenance tips');
  const toast = useToast();
  const { categories } = useAppData();
  const { data, loading, error, reload } = useApi('/admin/tips');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const open = (t) => {
    setEditing(t || 'new');
    setForm(t ? { title: t.title, excerpt: t.excerpt, body: t.body, categoryId: t.category?.id || '', published: t.published } : EMPTY);
    setFiles([]);
    setErrors({});
  };

  const save = async () => {
    const v = {};
    if (form.title.trim().length < 5) v.title = 'Use at least 5 characters.';
    if (form.body.trim().length < 50) v.body = 'Write at least 50 characters.';
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const payload = { title: form.title.trim(), excerpt: form.excerpt.trim(), body: form.body.trim(), categoryId: form.categoryId || null, published: form.published };
      if (editing === 'new') await api.upload('/admin/tips', { data: payload, files: { cover: files[0] } });
      else await api.upload(`/admin/tips/${editing.id}`, { data: payload, files: { cover: files[0] }, method: 'PATCH' });
      toast.success(editing === 'new' ? 'Article created.' : 'Article saved.');
      setEditing(null);
      reload();
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/admin/tips/${deleting.id}`);
      toast.success('Article deleted.');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Maintenance tips" description="Seasonal advice that keeps the site fresh and brings customers back." actions={<Button icon={PlusIcon} onClick={() => open(null)}>New article</Button>} />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <CardListSkeleton count={4} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={ArticleIcon} title="No articles yet" action={<Button onClick={() => open(null)}>Write the first one</Button>} />
      ) : (
        <ul className="grid gap-3">
          {data.items.map((t) => (
            <li key={t.id} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:flex-row sm:items-center">
              <div className="aspect-[16/9] w-full shrink-0 overflow-hidden rounded-2xl bg-surface-3 sm:w-40">
                {t.cover && <img src={t.cover} alt="" width="160" height="90" loading="lazy" className="size-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={t.published ? 'success' : 'neutral'}>{t.published ? 'Published' : 'Draft'}</Badge>
                  {t.category && <span className="text-xs font-semibold text-accent-text">{t.category.name}</span>}
                </div>
                <p className="mt-1 font-bold text-ink">{t.title}</p>
                <p className="text-xs text-muted">Published {formatDate(t.publishedAt)}, updated {formatDate(t.updatedAt)}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {t.published && (
                  <Link to={`/tips/${t.slug}`} target="_blank" className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold text-accent-text hover:underline">
                    View <ArrowSquareOutIcon size={14} aria-hidden="true" />
                  </Link>
                )}
                <Button size="sm" variant="secondary" icon={PencilSimpleIcon} onClick={() => open(t)}>Edit</Button>
                <Button size="sm" variant="danger-ghost" icon={TrashIcon} onClick={() => setDeleting(t)} aria-label={`Delete ${t.title}`}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New article' : 'Edit article'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={busy} onClick={save}>{editing === 'new' ? 'Create' : 'Save'}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="Title" required error={errors.title}>
            {(p) => <Input {...p} maxLength={140} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />}
          </Field>
          <Field label="Short summary" optional error={errors.excerpt}>
            {(p) => <Textarea {...p} rows={2} maxLength={300} value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
            <Field label="Related service" optional>
              {(p) => (
                <Select {...p} value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Toggle label="Published" description="Visible on the Tips page" checked={form.published} onChange={(v) => setForm((f) => ({ ...f, published: v }))} />
          </div>
          <Field
            label="Article"
            required
            error={errors.body}
            help="Leave a blank line between paragraphs. Start a line with ## for a subheading, and with - for a bullet point."
          >
            {(p) => <Textarea {...p} rows={12} maxLength={20000} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className="font-mono text-sm" />}
          </Field>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Cover image <span className="font-normal text-muted">(optional{editing !== 'new' ? ', replaces the current one' : ''})</span></p>
            <ImagePicker files={files} onChange={setFiles} max={1} label="Add cover" help="Landscape photo, around 1400 by 800 pixels." />
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} busy={busy} tone="danger" title="Delete this article?" description={deleting?.title} confirmLabel="Delete" />
    </div>
  );
}
