import { PencilSimpleIcon, PlusIcon, SquaresFourIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
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
import { useApi, useDocumentTitle } from '../../lib/hooks.js';
import { CATEGORY_ICONS, CategoryIcon } from '../../lib/icons.jsx';

const EMPTY = { name: '', icon: 'Wrench', description: '', order: 0, active: true };

export default function Categories() {
  useDocumentTitle('Categories');
  const toast = useToast();
  const { reload: reloadAppData } = useAppData();
  const { data, loading, error, reload } = useApi('/admin/categories');
  const [editing, setEditing] = useState(null); // null | 'new' | category
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const open = (c) => {
    setEditing(c || 'new');
    setForm(c ? { name: c.name, icon: c.icon, description: c.description || '', order: c.order ?? 0, active: c.active !== false } : EMPTY);
    setFiles([]);
    setErrors({});
  };

  const save = async () => {
    if (form.name.trim().length < 2) {
      setErrors({ name: 'Enter a name.' });
      return;
    }
    setBusy(true);
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description.trim(), order: Number(form.order) || 0 };
      if (editing === 'new') await api.upload('/admin/categories', { data: payload, files: { image: files[0] } });
      else await api.upload(`/admin/categories/${editing.id}`, { data: payload, files: { image: files[0] }, method: 'PATCH' });
      toast.success(editing === 'new' ? 'Category created.' : 'Category saved.');
      setEditing(null);
      reload();
      reloadAppData();
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
      await api.del(`/admin/categories/${deleting.id}`);
      toast.success('Category deleted.');
      setDeleting(null);
      reload();
      reloadAppData();
    } catch (err) {
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Categories" description="Services customers can request. Deactivate a category to hide it without losing history." actions={<Button icon={PlusIcon} onClick={() => open(null)}>New category</Button>} />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <CardListSkeleton count={5} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={SquaresFourIcon} title="No categories yet" action={<Button onClick={() => open(null)}>Create the first one</Button>} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.items.map((c) => (
            <li key={c.id} className="flex gap-4 rounded-card border border-line bg-surface p-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-accent-soft">
                {c.image ? <img src={c.image} alt="" width="80" height="80" loading="lazy" className="size-full object-cover" /> : (
                  <span className="flex size-full items-center justify-center text-accent-text"><CategoryIcon name={c.icon} size={30} /></span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-bold text-ink">
                  <CategoryIcon name={c.icon} size={18} className="text-accent-text" />
                  {c.name}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted">{c.description || 'No description'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <Badge tone={c.active ? 'success' : 'neutral'}>{c.active ? 'Active' : 'Hidden'}</Badge>
                  <span className="text-muted">{c.requests} requests, order {c.order}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" icon={PencilSimpleIcon} onClick={() => open(c)}>Edit</Button>
                  <Button size="sm" variant="danger-ghost" icon={TrashIcon} onClick={() => setDeleting(c)}>Delete</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New category' : `Edit ${editing?.name || ''}`}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={busy} onClick={save}>{editing === 'new' ? 'Create' : 'Save'}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
            <Field label="Name" required error={errors.name}>
              {(p) => <Input {...p} maxLength={60} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />}
            </Field>
            <Field label="Icon" error={errors.icon}>
              {(p) => (
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                    <CategoryIcon name={form.icon} size={22} />
                  </span>
                  <Select {...p} value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}>
                    {Object.keys(CATEGORY_ICONS).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </Select>
                </div>
              )}
            </Field>
          </div>
          <Field label="Description" optional error={errors.description}>
            {(p) => <Textarea {...p} rows={2} maxLength={300} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
            <Field label="Display order" help="Lower numbers appear first.">
              {(p) => <Input {...p} type="number" min="0" max="999" value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} />}
            </Field>
            <Toggle label="Active" description="Visible to customers" checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Cover image <span className="font-normal text-muted">(optional)</span></p>
            <ImagePicker files={files} onChange={setFiles} max={1} label="Add image" help="Landscape photo, shown on the home page." />
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        busy={busy}
        tone="danger"
        title={`Delete ${deleting?.name || ''}?`}
        description="Only possible when no requests use it. Otherwise deactivate it instead."
        confirmLabel="Delete"
      />
    </div>
  );
}
