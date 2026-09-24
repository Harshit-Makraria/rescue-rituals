/** Minimal RFC 5545 iCalendar builder for a single event. */

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Escape TEXT values: backslash, semicolon, comma, newline. */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Fold lines longer than 75 octets (continuation lines start with a space). */
function fold(line: string) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + (parts.length ? 74 : 75), bytes.length);
    // don't split a multi-byte UTF-8 character
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString('utf8'));
    start = end;
  }
  return parts.join('\r\n ');
}

export function buildIcs(event: {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  updatedAt: Date;
  url: string;
}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gather//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@gather-events`,
    `DTSTAMP:${stamp(event.updatedAt)}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(event.endsAt)}`,
    `SUMMARY:${esc(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${esc(`${event.description}\n\n${event.url}`)}`] : [`DESCRIPTION:${esc(event.url)}`]),
    ...(event.location ? [`LOCATION:${esc(event.location)}`] : []),
    `URL:${event.url}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(event.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
