export function pkr(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '';
  return `Rs ${Math.round(Number(amount)).toLocaleString('en-PK')}`;
}

export function budgetLabel(budget) {
  if (!budget) return 'Open to offers';
  const { min, max } = budget;
  if (min && max) return `${pkr(min)} to ${pkr(max)}`;
  if (max) return `Up to ${pkr(max)}`;
  if (min) return `From ${pkr(min)}`;
  return 'Open to offers';
}

export function eta(mins) {
  if (!mins && mins !== 0) return '';
  if (mins < 60) return `${mins} min`;
  if (mins < 60 * 24) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const d = Math.round(mins / (60 * 24));
  return `${d} day${d === 1 ? '' : 's'}`;
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function timeAgo(date) {
  if (!date) return '';
  const diff = (new Date(date).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return 'just now';
  const units = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86400],
    ['week', 604800],
    ['month', 2629800],
    ['year', 31557600],
  ];
  let unit = 'minute';
  let value = diff / 60;
  for (const [name, secs] of units) {
    if (abs >= secs) {
      unit = name;
      value = diff / secs;
    }
  }
  return rtf.format(Math.round(value), unit);
}

export function formatDate(date, opts = {}) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...opts });
}

export function formatDateTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
}

export function memberSince(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export const URGENCY = {
  emergency: { label: 'Emergency', hint: 'As soon as possible', tone: 'danger' },
  today: { label: 'Today', hint: 'Within the day', tone: 'warning' },
  this_week: { label: 'This week', hint: 'Within a few days', tone: 'info' },
  flexible: { label: 'Flexible', hint: 'Whenever suits', tone: 'neutral' },
};

export const REQUEST_STATUS = {
  open: { label: 'Open for offers', short: 'Open', tone: 'accent' },
  assigned: { label: 'Provider hired', short: 'In progress', tone: 'info' },
  completed: { label: 'Completed', short: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', short: 'Cancelled', tone: 'neutral' },
};

export const OFFER_STATUS = {
  pending: { label: 'Waiting for customer', short: 'Pending', tone: 'warning' },
  accepted: { label: 'Accepted', short: 'Accepted', tone: 'success' },
  rejected: { label: 'Not selected', short: 'Not selected', tone: 'neutral' },
  withdrawn: { label: 'Withdrawn', short: 'Withdrawn', tone: 'neutral' },
};

export const ETA_OPTIONS = [
  { value: 30, label: 'Within 30 minutes' },
  { value: 45, label: 'Within 45 minutes' },
  { value: 60, label: 'Within 1 hour' },
  { value: 90, label: 'Within 1.5 hours' },
  { value: 120, label: 'Within 2 hours' },
  { value: 180, label: 'Within 3 hours' },
  { value: 300, label: 'Later today (5 hours)' },
  { value: 1440, label: 'Tomorrow' },
  { value: 2880, label: 'In 2 days' },
  { value: 4320, label: 'In 3 days' },
  { value: 10080, label: 'Within a week' },
];

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Is the provider inside their weekly working hours right now (Pakistan time)? */
export function isWithinHours(weekly = []) {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  const today = weekly.find((d) => d.day === now.getDay());
  if (!today?.enabled) return false;
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return hm >= today.from && hm < today.to;
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export function plural(n, word, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`;
}
