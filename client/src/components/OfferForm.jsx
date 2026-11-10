import { PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { ETA_OPTIONS } from '../lib/format.js';
import { PriceGuide } from './platform/PriceGuide.jsx';
import { Button } from './ui/Button.jsx';
import { Checkbox, Field, Input, Select, Textarea } from './ui/Field.jsx';

const WARRANTY = [0, 7, 15, 30, 90, 180, 365];

/** Create or edit an offer: price, arrival time, what is included, warranty. */
export function OfferForm({ initial, onSubmit, onCancel, submitLabel = 'Send offer', busy, categorySlug }) {
  const [form, setForm] = useState({
    price: initial?.price ?? '',
    etaMinutes: initial?.etaMinutes ?? 60,
    details: initial?.details ?? '',
    warrantyDays: initial?.warrantyDays ?? 0,
    includesMaterials: initial?.includesMaterials ?? false,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const etaOptions = ETA_OPTIONS.some((o) => o.value === Number(form.etaMinutes))
    ? ETA_OPTIONS
    : [...ETA_OPTIONS, { value: Number(form.etaMinutes), label: `${form.etaMinutes} minutes` }].sort((a, b) => a.value - b.value);

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    const price = Number(form.price);
    if (!Number.isInteger(price) || price < 100) v.price = 'Enter a whole number of at least Rs 100.';
    if (form.details.trim().length < 10) v.details = 'Explain what your price includes (at least 10 characters).';
    setErrors(v);
    if (Object.keys(v).length) return;
    setServerError('');
    try {
      await onSubmit({
        price,
        etaMinutes: Number(form.etaMinutes),
        details: form.details.trim(),
        warrantyDays: Number(form.warrantyDays),
        includesMaterials: form.includesMaterials,
      });
    } catch (err) {
      setServerError(err.message);
      if (err.fields) setErrors(err.fields);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <PriceGuide categorySlug={categorySlug} audience="provider" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your price (Rs)" required error={errors.price} help="Total for the job, including labour.">
          {(p) => <Input {...p} type="number" inputMode="numeric" min="100" step="50" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />}
        </Field>
        <Field label="You can arrive" required error={errors.etaMinutes}>
          {(p) => (
            <Select {...p} value={form.etaMinutes} onChange={(e) => setForm((f) => ({ ...f, etaMinutes: e.target.value }))}>
              {etaOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field label="What is included" required error={errors.details} help={`Parts, labour, cleanup, visits. ${form.details.length}/1000`}>
        {(p) => <Textarea {...p} rows={4} maxLength={1000} value={form.details} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
        <Field label="Warranty on your work">
          {(p) => (
            <Select {...p} value={form.warrantyDays} onChange={(e) => setForm((f) => ({ ...f, warrantyDays: e.target.value }))}>
              {WARRANTY.map((d) => (
                <option key={d} value={d}>
                  {d === 0 ? 'No warranty' : `${d} days`}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Checkbox
          label="Price includes materials"
          description="Parts and supplies are covered"
          checked={form.includesMaterials}
          onChange={(e) => setForm((f) => ({ ...f, includesMaterials: e.target.checked }))}
          className="pb-2"
        />
      </div>
      {serverError && (
        <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger" role="alert">
          {serverError}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy} icon={PaperPlaneTiltIcon}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
