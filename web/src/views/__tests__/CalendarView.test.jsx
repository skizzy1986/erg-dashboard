import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EVENT_LADDER } from '../../constants/schedule.js';

const statusesMock = vi.fn();

// Mocked at the module boundary so the view test stays free of Supabase and of
// the wall clock; the resolver itself is covered in benchmarkStatus.test.js.
vi.mock('../../hooks/useBenchmarkStatuses.js', () => ({
  useBenchmarkStatuses: (...args) => statusesMock(...args),
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

  it('resolves the full ladder once, not per row', () => {
    renderView();
    expect(statusesMock).toHaveBeenCalledTimes(1);
    expect(statusesMock).toHaveBeenCalledWith();
  });
});
