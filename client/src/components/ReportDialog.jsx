import { FlagIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { Button } from './ui/Button.jsx';
import { Field, Select, Textarea } from './ui/Field.jsx';
import { Modal } from './ui/Modal.jsx';

const REASONS = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'fraud', label: 'Scam, or asking for payment outside LocalFix' },
  { value: 'abusive', label: 'Abusive or threatening' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'fake', label: 'Fake or misleading' },
  { value: 'no_show', label: 'Did not show up' },
  { value: 'other', label: 'Something else' },
];

const NOUN = { user: 'provider', request: 'request', message: 'message', review: 'review' };

export function ReportDialog({ open, onClose, targetType, targetId }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!reason) {
      setError('Choose a reason.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/reports', { targetType, targetId, reason, details });
      toast.success(res.message);
      setReason('');
      setDetails('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Report this ${NOUN[targetType]}`}
      description="Reports are private. Our moderators review every report within 24 hours."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} loading={busy}>
            Send report
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Reason" required error={error}>
          {(p) => (
            <Select {...p} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Choose a reason</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="What happened?" optional help="Details help us act faster. Do not include passwords or card numbers.">
          {(p) => <Textarea {...p} rows={4} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />}
        </Field>
      </div>
    </Modal>
  );
}

export function ReportButton({ targetType, targetId, label = 'Report', className = '' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon={FlagIcon}
        className={`text-muted ${className}`}
        onClick={() => (user ? setOpen(true) : navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`))}
      >
        {label}
      </Button>
      {user && <ReportDialog open={open} onClose={() => setOpen(false)} targetType={targetType} targetId={targetId} />}
    </>
  );
}
