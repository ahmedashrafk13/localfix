// Minimal iCalendar (RFC 5545) writer for a single event, so a booked job can be added to
// Google Calendar, Apple Calendar or Outlook with one click.

/** Escapes TEXT values: backslash, semicolon, comma and newlines (RFC 5545 section 3.3.11). */
export function escapeText(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** UTC timestamp in the basic format, e.g. 20261110T093000Z. */
export function formatUtc(date) {
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** Folds a content line at 75 octets, continuation lines start with a space (RFC 5545 section 3.1). */
export function foldLine(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts = [];
  let chunk = '';
  let size = 0;
  for (const ch of line) {
    const len = Buffer.byteLength(ch, 'utf8');
    const limit = parts.length ? 74 : 75; // continuation lines lose one octet to the leading space
    if (size + len > limit) {
      parts.push(chunk);
      chunk = '';
      size = 0;
    }
    chunk += ch;
    size += len;
  }
  parts.push(chunk);
  return parts.join('\r\n ');
}

export function buildEvent({ uid, start, end, summary, description = '', location = '', url = '', geo = null, stamp = new Date() }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LocalFix//Job booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatUtc(stamp)}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeText(summary)}`,
    description ? `DESCRIPTION:${escapeText(description)}` : null,
    location ? `LOCATION:${escapeText(location)}` : null,
    geo ? `GEO:${geo.lat};${geo.lng}` : null,
    url ? `URL:${url}` : null,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:LocalFix job starts in 30 minutes',
    'TRIGGER:-PT30M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.filter(Boolean).map(foldLine).join('\r\n')}\r\n`;
}
