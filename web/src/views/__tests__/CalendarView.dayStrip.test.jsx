import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mocked at the module boundary, same as CalendarView.test.jsx — vi.mock is
// per-file, so these have to be repeated. Simplified to quiet defaults: the
// ladder panel is not under test here, only the day strip above it.
vi.mock('../../hooks/useBenchmarkStatuses.js', () => ({
  useBenchmarkStatuses: () => [],
  useBenchmarkDataUnavailable: () => false,
}));

vi.mock('../../hooks/useBenchmarkSessions.js', () => ({
  useBenchmarkSessions: () => ({ data: [] }),
}));

vi.mock('../../hooks/useLinkBenchmarkSession.js', () => ({
  useLinkBenchmarkSession: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import CalendarView from '../CalendarView.jsx';

// Dates are unpadded M/D/YY on purpose. logEntriesForDate builds its key with
// getMonth()+1 and getDate() — no zero padding — so a '06/23/26' fixture would
// match nothing and every assertion below would pass vacuously.
const LOGGED = [
  {
    date: '6/23/26',
    type: 'erg',
    label: 'CP Test - 4min MAX (GATED)',
    status: 'completed',
  },
  {
    date: '6/25/26',
    type: 'strength',
    label: 'Lower A (RDL-led)',
    status: 'completed',
  },
  {
    date: '6/25/26',
    type: 'erg',
    label: 'Warm-down paddle (post-Lower)',
    status: 'completed',
  },
  {
    date: '6/29/26',
    type: 'erg',
    label: 'UT1 50min steady',
    status: 'completed',
  },
];

const CANCELLED = [
  {
    date: '6/23/26',
    type: 'erg',
    label: 'UT1 50min steady',
    status: 'cancelled',
  },
  {
    date: '6/24/26',
    type: 'erg',
    label: 'UT2 30min recovery @ 125-135W',
    status: 'cancelled',
  },
  { date: '6/24/26', type: 'strength', label: 'Upper A', status: 'cancelled' },
  {
    date: '6/25/26',
    type: 'cycling',
    label: 'Bike VO2: 5x3min @ 270-285W',
    status: 'cancelled',
  },
  { date: '6/28/26', type: 'strength', label: 'Upper A', status: 'cancelled' },
];

function renderView(props = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CalendarView loggedSessions={LOGGED} isWide={false} {...props} />
    </QueryClientProvider>
  );
}

// The strip is the banner div's next sibling; each child is one day cell and
// each cell's first child is its header row. Index i is day `today - 3 + i`,
// because CalendarView walks i = -BACK..FWD with BACK = 3. Locating by status
// text would be ambiguous — '— not logged' and 'UPCOMING' repeat down the strip.
function stripCells(container) {
  const banner = within(container).getByText(/YOUR WEEKS/i).parentElement;
  return Array.from(banner.nextElementSibling.children);
}

function headerTexts(container) {
  return stripCells(container).map((c) => c.firstElementChild.textContent);
}

describe('CalendarView day strip — cancelled marker (#242)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Local-argument constructor: TZ-independent, and the same idiom the
    // schedule tests use. 26 Jun 26 puts 23 Jun – 9 Jul in the window, which
    // holds every case as a real date from the live table.
    vi.setSystemTime(new Date(2026, 5, 26, 9, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('AC6 pins the clock so the window is 23 Jun – 9 Jul', () => {
    const { container } = renderView({ cancelledSessions: CANCELLED });
    const cells = stripCells(container);
    expect(cells).toHaveLength(17);
    expect(cells[0].textContent).toMatch(/23/);
    expect(cells[3].firstElementChild.textContent).toContain('● TODAY');
  });

  it('AC1 marks a both-states day differently from a completed-only day', () => {
    const { container } = renderView({ cancelledSessions: CANCELLED });
    const headers = headerTexts(container);
    expect(headers[2]).toContain('✓ DONE ×2');
    expect(headers[2]).toContain('⊘ 1 CANCELLED');
    // 6/29 is completed-only — the control that proves the marker is not
    // painted onto every day with a session.
    expect(headers[6]).toContain('✓ DONE');
    expect(headers[6]).not.toContain('⊘');
  });

  it('AC3 reads both facts off one day in a single textContent', () => {
    const { container } = renderView({ cancelledSessions: CANCELLED });
    const header = headerTexts(container)[2];
    expect(header).toMatch(/✓ DONE ×2/);
    expect(header).toMatch(/⊘ 1 CANCELLED/);
  });

  it('AC2 marks a cancelled-only past day instead of leaving it blank', () => {
    const { container } = renderView({ cancelledSessions: CANCELLED });
    const headers = headerTexts(container);
    expect(headers[1]).toContain('— not logged');
    expect(headers[1]).toContain('⊘ 2 CANCELLED');
  });

  it('AC5 counts only completed sessions in ×N — cancelled never inflates it', () => {
    // The regression trap. If a cancelled row leaked into loggedSessions,
    // 6/23 would read ✓ DONE ×2 and 6/25 ✓ DONE ×3.
    const { container } = renderView({ cancelledSessions: CANCELLED });
    const headers = headerTexts(container);
    expect(headers[0]).toContain('✓ DONE');
    expect(headers[0]).not.toContain('×2');
    expect(headers[0]).toContain('⊘ 1 CANCELLED');
    expect(headers[2]).toContain('×2');
    expect(headers[2]).not.toContain('×3');
  });

  it('AC8 marks a cancelled-only FUTURE day — a session dropped ahead of time', () => {
    const { container } = renderView({ cancelledSessions: CANCELLED });
    const headers = headerTexts(container);
    expect(headers[5]).toContain('UPCOMING');
    expect(headers[5]).toContain('⊘ 1 CANCELLED');
  });

  it('leaves a day with no record at all clean', () => {
    const { container } = renderView({ cancelledSessions: CANCELLED });
    const headers = headerTexts(container);
    expect(headers[3]).toContain('● TODAY');
    expect(headers[3]).not.toContain('⊘');
    expect(headers[4]).not.toContain('⊘');
  });

  it('lifts a cancelled-only past day from 0.5 to 0.75 opacity', () => {
    const { container } = renderView({ cancelledSessions: CANCELLED });
    expect(stripCells(container)[1].style.opacity).toBe('0.75');
  });

  it('AC7 renders identically with an empty list and with the prop omitted', () => {
    const empty = renderView({ cancelledSessions: [] });
    const omitted = renderView();
    const withEmpty = headerTexts(empty.container);
    const withoutProp = headerTexts(omitted.container);
    expect(withoutProp).toEqual(withEmpty);
    expect(withEmpty.join('')).not.toContain('⊘');
  });
});

describe('CalendarView day strip — cancelled on today (#242)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 24, 9, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks today itself when the day only holds cancellations', () => {
    const { container } = renderView({ cancelledSessions: CANCELLED });
    const header = headerTexts(container)[3];
    expect(header).toContain('● TODAY');
    expect(header).toContain('⊘ 2 CANCELLED');
  });

  it('leaves a clean past day at 0.5 opacity and unmarked', () => {
    const { container } = renderView({ cancelledSessions: CANCELLED });
    const cells = stripCells(container);
    expect(cells[0].firstElementChild.textContent).toContain('— not logged');
    expect(cells[0].firstElementChild.textContent).not.toContain('⊘');
    expect(cells[0].style.opacity).toBe('0.5');
  });
});
