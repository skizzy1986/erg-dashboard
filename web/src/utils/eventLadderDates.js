// Resolves an EVENT_LADDER entry to the calendar window in which the event may
// legitimately happen. Knows nothing about sessions or "today" — it returns a
// window, never a status.
//
// Two deliberate traps are avoided here:
//  - Unparseable input returns null, NEVER today. toLogDate() in dateFormat.js
//    falls back to today; copying that here would silently invent a window and
//    turn "cannot determine" into a confident (wrong) overdue signal.
//  - Every Date is built with new Date(y, mIdx, d). new Date('2026-07-01')
//    parses as UTC midnight and reads back as 30 Jun in any negative-offset
//    zone, shifting every window boundary by a day.

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function monthIndex(token) {
  return MONTHS.indexOf(String(token).toLowerCase().slice(0, 3));
}

function lastDayOfMonth(year, mIdx) {
  return new Date(year, mIdx + 1, 0).getDate();
}

function localDate(year, mIdx, day) {
  return new Date(year, mIdx, day);
}

function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return localDate(y, m - 1, d);
}

function endOfMonthOf(date) {
  return localDate(
    date.getFullYear(),
    date.getMonth(),
    lastDayOfMonth(date.getFullYear(), date.getMonth())
  );
}

function normalise(text) {
  const raw = text == null ? '' : String(text);
  const stripped = raw.replace(/^[^a-zA-Z0-9]+/, '');
  const approximate = stripped.includes('~');
  const cleaned = stripped
    .replace(/~/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return { cleaned, approximate };
}

function build(start, end, approximate, source) {
  return {
    start,
    end,
    overdueAfter: approximate ? endOfMonthOf(end) : end,
    approximate,
    source,
  };
}

// Exported for direct testing.
export function parseLadderDateText(text) {
  const { cleaned, approximate } = normalise(text);
  if (!cleaned) return null;

  // Ddd D MON YY — "Wed 1 Jul 26". The weekday prefix is discarded, never
  // validated; the numeric date is authoritative.
  let m = cleaned.match(/^[a-z]{3,}\s+(\d{1,2})\s+([a-z]{3,})\s+(\d{2})$/i);
  if (m) return singleDay(Number(m[1]), m[2], m[3], approximate);

  // D MON YY — "1 Jul 26"
  m = cleaned.match(/^(\d{1,2})\s+([a-z]{3,})\s+(\d{2})$/i);
  if (m) return singleDay(Number(m[1]), m[2], m[3], approximate);

  // D MON-D MON YY — "12 Sep-9 Oct 26"
  m = cleaned.match(
    /^(\d{1,2})\s+([a-z]{3,})\s*-\s*(\d{1,2})\s+([a-z]{3,})\s+(\d{2})$/i
  );
  if (m) {
    const year = 2000 + Number(m[5]);
    const fromIdx = monthIndex(m[2]);
    const toIdx = monthIndex(m[4]);
    const fromDay = Number(m[1]);
    const toDay = Number(m[3]);
    if (fromIdx < 0 || toIdx < 0) return null;
    if (!validDay(year, fromIdx, fromDay) || !validDay(year, toIdx, toDay)) {
      return null;
    }
    return build(
      localDate(year, fromIdx, fromDay),
      localDate(year, toIdx, toDay),
      approximate,
      'parsed'
    );
  }

  // MON-MON YY — "Nov-Dec 26"
  m = cleaned.match(/^([a-z]{3,})\s*-\s*([a-z]{3,})\s+(\d{2})$/i);
  if (m) {
    const year = 2000 + Number(m[3]);
    const fromIdx = monthIndex(m[1]);
    const toIdx = monthIndex(m[2]);
    if (fromIdx < 0 || toIdx < 0) return null;
    return build(
      localDate(year, fromIdx, 1),
      localDate(year, toIdx, lastDayOfMonth(year, toIdx)),
      true,
      'parsed'
    );
  }

  // Early/Mid/Late MON YY
  m = cleaned.match(/^(early|mid|late)\s+([a-z]{3,})\s+(\d{2})$/i);
  if (m) {
    const year = 2000 + Number(m[3]);
    const mIdx = monthIndex(m[2]);
    if (mIdx < 0) return null;
    const band = m[1].toLowerCase();
    const startDay = band === 'early' ? 1 : band === 'mid' ? 11 : 21;
    const endDay =
      band === 'early' ? 10 : band === 'mid' ? 20 : lastDayOfMonth(year, mIdx);
    return build(
      localDate(year, mIdx, startDay),
      localDate(year, mIdx, endDay),
      true,
      'parsed'
    );
  }

  // MON YY — "Aug 26"
  m = cleaned.match(/^([a-z]{3,})\s+(\d{2})$/i);
  if (m) {
    const year = 2000 + Number(m[2]);
    const mIdx = monthIndex(m[1]);
    if (mIdx < 0) return null;
    return build(
      localDate(year, mIdx, 1),
      localDate(year, mIdx, lastDayOfMonth(year, mIdx)),
      true,
      'parsed'
    );
  }

  return null;
}

function validDay(year, mIdx, day) {
  return day >= 1 && day <= lastDayOfMonth(year, mIdx);
}

function singleDay(day, monToken, yyToken, approximate) {
  const year = 2000 + Number(yyToken);
  const mIdx = monthIndex(monToken);
  if (mIdx < 0 || !validDay(year, mIdx, day)) return null;
  const when = localDate(year, mIdx, day);
  return build(when, when, approximate, 'parsed');
}

export function resolveEventWindow(entry) {
  if (!entry) return null;

  // Structured windows win, and are never widened to month-end regardless of a
  // '~' in the free-text date.
  const { windowStart, windowEnd } = entry;
  if (
    typeof windowStart === 'string' &&
    typeof windowEnd === 'string' &&
    ISO_RE.test(windowStart) &&
    ISO_RE.test(windowEnd)
  ) {
    const end = fromISO(windowEnd);
    return {
      start: fromISO(windowStart),
      end,
      overdueAfter: end,
      approximate: false,
      source: 'structured',
    };
  }

  return parseLadderDateText(entry.date);
}
