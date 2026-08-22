import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EVENT_LADDER } from '../../constants/schedule.js';

const statusesMock = vi.fn();

// Mocked at the module boundary so the view test stays free of Supabase and of
// the wall clock; the resolver itself is covered in benchmarkStatus.test.js.
vi.mock('../../hooks/useBenchmarkStatuses.js', () => ({
  useBenchmarkStatuses: (...args) => statusesMock(...args),
  useBenchmarkDataUnavailable: () => false,
}));

import CalendarView from '../CalendarView.jsx';

function quietStates() {
  return EVENT_LADDER.map((entry, index) => ({
    entry,
    index,
    status: 'quiet',
    window: null,
    fuzzy: false,
    done: false,
    matchedSessionId: null,
    daysUntilStart: null,
    daysOverdue: null,
    rescheduledTo: null,
    plannedSessionId: null,
    keywords: [],
  }));
}

// CalendarView now calls a useQuery-backed hook, so the render needs a client
// even though the hook is mocked here (main.jsx already wraps <App>).
function renderView() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CalendarView loggedSessions={[]} isWide={false} />
    </QueryClientProvider>
  );
}

// The ladder panel's rows, in DOM order — the only way to assert that the loud
// rows actually float to the top rather than merely rendering somewhere.
function ladderRowTexts() {
  const heading = screen.getByText(/UPCOMING EVENTS · SEASON 1 LADDER/i);
  return Array.from(heading.parentElement.children)
    .filter((el) => el !== heading)
    .map((el) => el.textContent);
}

beforeEach(() => {
  statusesMock.mockReset();
  statusesMock.mockReturnValue(quietStates());
});

describe('CalendarView', () => {
  it('renders the week strip header and the upcoming events ladder', () => {
    renderView();
    expect(screen.getByText(/YOUR WEEKS/i)).toBeInTheDocument();
    expect(
      screen.getByText(/UPCOMING EVENTS · SEASON 1 LADDER/i)
    ).toBeInTheDocument();
  });

  it('shows no benchmark badges when every entry is quiet', () => {
    renderView();
    expect(screen.queryByText(/OVERDUE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^DUE/)).not.toBeInTheDocument();
  });

  // R1 — the AC-3 signal actually reaches the surface Scott looks at.
  it('renders an OVERDUE badge against the 5k Time Trial row', () => {
    const states = quietStates();
    states[2] = {
      ...states[2],
      status: 'overdue',
      window: { start: '2026-08-01', end: '2026-08-10' },
      fuzzy: true,
      daysOverdue: 10,
    };
    statusesMock.mockReturnValue(states);
    renderView();

    const badge = screen.getByText('OVERDUE · 10d');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement.textContent).toContain('5k Time Trial');
    expect(screen.getAllByText(/OVERDUE/)).toHaveLength(1);
  });

  it('renders a DUE badge with the fuzzy qualifier', () => {
    const states = quietStates();
    states[1] = {
      ...states[1],
      status: 'upcoming',
      fuzzy: true,
      daysUntilStart: 3,
    };
    statusesMock.mockReturnValue(states);
    renderView();

    const badge = screen.getByText('DUE · 3d · exact date TBD');
    expect(badge.parentElement.textContent).toContain(
      'CP Test #2 (2nd duration)'
    );
  });

  // AC5 — five permanent warnings in ladder order is the same wallpaper the
  // feature exists to remove. What is actionable has to be at the top.
  it('AC5 sorts the visible rows overdue → upcoming → the rest', () => {
    const states = quietStates();
    states[4] = { ...states[4], status: 'overdue', daysOverdue: 12 };
    states[1] = { ...states[1], status: 'upcoming', daysUntilStart: 3 };
    statusesMock.mockReturnValue(states);
    renderView();

    const rows = ladderRowTexts();
    expect(rows).toHaveLength(5);
    expect(rows[0]).toContain(EVENT_LADDER[4].name);
    expect(rows[0]).toContain('OVERDUE · 12d');
    expect(rows[1]).toContain(EVENT_LADDER[1].name);
    expect(rows[1]).toContain('DUE · 3d');
    // The quiet remainder keeps ladder order behind them.
    expect(rows.slice(2).map((t) => t.includes(EVENT_LADDER[0].name))).toEqual([
      true,
      false,
      false,
    ]);
  });

  // Slicing happens BEFORE sorting, so severity reorders the visible five but
  // never changes which five they are. Without that order a benchmark going
  // overdue deep in the ladder — the 2k Test, when its Jan 2027 window elapses
  // — would silently displace a nearer event from the panel.
  it('AC5 sorts within the visible five without changing which five they are', () => {
    const states = quietStates();
    const deep = states.length - 1;
    expect(deep).toBeGreaterThan(4);
    states[deep] = { ...states[deep], status: 'overdue', daysOverdue: 400 };
    statusesMock.mockReturnValue(states);
    renderView();

    const rows = ladderRowTexts();
    expect(rows).toHaveLength(5);
    expect(rows.join(' ')).not.toContain(EVENT_LADDER[deep].name);
    expect(screen.queryByText(/OVERDUE · 400d/)).toBeNull();
    // Untouched ladder order behind the cut.
    expect(rows[0]).toContain(EVENT_LADDER[0].name);
  });

  it('AC4/AC5 renders a rescheduled badge and sorts it below the loud rows', () => {
    const states = quietStates();
    states[4] = { ...states[4], status: 'overdue', daysOverdue: 12 };
    states[1] = { ...states[1], status: 'upcoming', daysUntilStart: 3 };
    states[0] = {
      ...states[0],
      status: 'scheduled',
      daysOverdue: 50,
      rescheduledTo: '2026-09-12',
      plannedSessionId: 300,
    };
    statusesMock.mockReturnValue(states);
    renderView();

    const badge = screen.getByText('↻ RESCHEDULED · 9/12/26 · 50d OVERDUE');
    expect(badge.parentElement.textContent).toContain(EVENT_LADDER[0].name);

    const rows = ladderRowTexts();
    expect(rows[0]).toContain(EVENT_LADDER[4].name);
    expect(rows[1]).toContain(EVENT_LADDER[1].name);
    expect(rows[2]).toContain(EVENT_LADDER[0].name);
  });

  it('resolves the full ladder once, not per row', () => {
    renderView();
    expect(statusesMock).toHaveBeenCalledTimes(1);
    expect(statusesMock).toHaveBeenCalledWith();
  });
});
