import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EVENT_LADDER } from '../../constants/schedule.js';

const statusesMock = vi.fn();
const sessionsMock = vi.fn();
const mutateMock = vi.fn();
let mutationState;

// Mocked at the module boundary so the view test stays free of Supabase and of
// the wall clock; the resolver itself is covered in benchmarkStatus.test.js.
vi.mock('../../hooks/useBenchmarkStatuses.js', () => ({
  useBenchmarkStatuses: (...args) => statusesMock(...args),
  useBenchmarkDataUnavailable: () => false,
}));

vi.mock('../../hooks/useBenchmarkSessions.js', () => ({
  useBenchmarkSessions: (...args) => sessionsMock(...args),
}));

vi.mock('../../hooks/useLinkBenchmarkSession.js', () => ({
  useLinkBenchmarkSession: () => ({ mutate: mutateMock, ...mutationState }),
}));

import CalendarView from '../CalendarView.jsx';

const CANDIDATES = [
  {
    id: 45,
    date: '6/23/26',
    label: 'CP Test - 4min MAX (GATED)',
    status: 'completed',
    benchmark_key: null,
  },
  {
    id: 70,
    date: '8/3/26',
    label: 'PM — 5,000m',
    status: 'completed',
    benchmark_key: null,
  },
];

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
  sessionsMock.mockReset();
  sessionsMock.mockReturnValue({ data: CANDIDATES });
  mutateMock.mockReset();
  mutationState = { isPending: false, isError: false, error: null };
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

  // AC5 — nine permanent warnings in ladder order is the same wallpaper the
  // feature exists to remove. What is actionable has to be at the top; severity
  // order is what makes rendering the whole ladder (#228) survivable.
  it('AC5 sorts every row overdue → upcoming → the rest', () => {
    const states = quietStates();
    states[4] = { ...states[4], status: 'overdue', daysOverdue: 12 };
    states[1] = { ...states[1], status: 'upcoming', daysUntilStart: 3 };
    statusesMock.mockReturnValue(states);
    renderView();

    const rows = ladderRowTexts();
    expect(rows).toHaveLength(EVENT_LADDER.length);
    expect(rows[0]).toContain(EVENT_LADDER[4].name);
    expect(rows[0]).toContain('OVERDUE · 12d');
    expect(rows[1]).toContain(EVENT_LADDER[1].name);
    expect(rows[1]).toContain('DUE · 3d');
    // Everything still quiet keeps ladder order behind the loud rows — the tie
    // break is the ladder index, so this is the full remainder, in sequence.
    const quietOrder = EVENT_LADDER.map((e, i) => i).filter(
      (i) => i !== 4 && i !== 1
    );
    expect(rows.slice(2)).toHaveLength(quietOrder.length);
    quietOrder.forEach((ladderIndex, row) => {
      expect(rows[row + 2]).toContain(EVENT_LADDER[ladderIndex].name);
    });
  });

  // The inverse of what this test used to assert. The panel was capped at the
  // first five by position, so a benchmark going overdue deep in the ladder —
  // the 2k Test, once its Jan 2027 window elapses — could never surface however
  // loud it got (#215). It now surfaces AND outranks the quiet rows.
  it('AC5 surfaces a benchmark that goes overdue deep in the ladder (#215)', () => {
    const states = quietStates();
    const deep = states.length - 1;
    expect(deep).toBeGreaterThan(4);
    states[deep] = { ...states[deep], status: 'overdue', daysOverdue: 400 };
    statusesMock.mockReturnValue(states);
    renderView();

    const rows = ladderRowTexts();
    expect(rows).toHaveLength(EVENT_LADDER.length);
    expect(rows[0]).toContain(EVENT_LADDER[deep].name);
    expect(rows[0]).toContain('OVERDUE · 400d');
  });

  // The TARGET entry is the season's whole point and index 7 — it was outside
  // the old cut, so its distinct colour branch in this view was unreachable.
  it('renders the TARGET champs entry that the cut used to hide (#228)', () => {
    renderView();
    const rows = ladderRowTexts();
    const target = EVENT_LADDER.find((e) => e.kind === 'TARGET');
    expect(target).toBeDefined();
    expect(rows.join(' ')).toContain(target.name);
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

// The whole ladder renders now (#228), so every kind='benchmark' entry gets a
// control — five of the nine, not the three the old cut left visible. The other
// four (two competitions, the TARGET, the optional sprint) carry no `key`, so a
// control on those rows could only ever write a null slug.
describe('CalendarView benchmark link control', () => {
  it('renders a control on every benchmark row and on no other kind', () => {
    renderView();
    const controls = screen.getAllByRole('button', { name: /^Link a session/ });
    // Derived from the ladder, not hardcoded: adding a benchmark should extend
    // this list rather than silently pass. All rows are quiet here, so severity
    // ties break on ladder index and DOM order is ladder order.
    expect(controls.map((b) => b.getAttribute('aria-label'))).toEqual(
      EVENT_LADDER.filter((e) => e.kind === 'benchmark').map(
        (e) => `Link a session to ${e.name}`
      )
    );
    expect(controls).toHaveLength(5);
    for (const name of [
      /Erg Power Series/,
      /C2 Monthly/,
      /World Rowing Virtual Indoor Champs/,
      /WR Virtual Indoor Sprints/,
    ]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  // Every state is 'unknown' while the sessions read is pending or failed.
  // Rendering the control then would flash LINK before flipping to LINKED, and
  // hand over a picker with nothing in it.
  it('renders no control at all while the benchmark statuses are unknown', () => {
    statusesMock.mockReturnValue(
      quietStates().map((s) => ({ ...s, status: 'unknown' }))
    );
    renderView();
    expect(
      screen.queryAllByRole('button', { name: /^Link a session/ })
    ).toHaveLength(0);
  });

  it('reads LINKED ✓ on a benchmark the resolver matched to a session', () => {
    const states = quietStates();
    states[0] = { ...states[0], done: true, matchedSessionId: 45 };
    statusesMock.mockReturnValue(states);
    renderView();

    const controls = screen.getAllByRole('button', { name: /^Link a session/ });
    expect(controls[0]).toHaveTextContent('LINKED ✓');
    expect(controls[1]).toHaveTextContent('LINK');
    expect(controls[1]).not.toHaveTextContent('LINKED');
  });

  it('sends the ladder slug and the chosen session id to the mutation', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(
      screen.getByRole('button', { name: 'Link a session to 5k Time Trial' })
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Session for 5k Time Trial' }),
      '70'
    );

    expect(mutateMock).toHaveBeenCalledWith({
      benchmarkKey: '5k-tt',
      sessionId: 70,
    });
  });

  // A 23505 means another session already holds this slug. Saying "failed"
  // would hide the only fact that tells Scott what to do next.
  it('names the unique violation instead of a generic failure, on that row only', async () => {
    const user = userEvent.setup();
    mutationState = {
      isPending: false,
      isError: true,
      error: { code: '23505', message: 'duplicate key value violates …' },
    };
    renderView();

    // Nothing shows until this row is the one that issued the write.
    expect(screen.queryByText(/already claims/)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Link a session to 5k Time Trial' })
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Session for 5k Time Trial' }),
      '70'
    );

    expect(
      screen.getByText('Another session already claims this benchmark')
    ).toBeInTheDocument();
    expect(screen.getAllByText(/already claims/)).toHaveLength(1);
  });

  it('falls back to the driver message for any other write failure', async () => {
    const user = userEvent.setup();
    mutationState = {
      isPending: false,
      isError: true,
      error: { code: '42501', message: 'permission denied for table sessions' },
    };
    renderView();
    await user.click(
      screen.getByRole('button', {
        name: 'Link a session to CP Test #1 (4-min)',
      })
    );
    await user.selectOptions(
      screen.getByRole('combobox', {
        name: 'Session for CP Test #1 (4-min)',
      }),
      '45'
    );

    expect(
      screen.getByText('permission denied for table sessions')
    ).toBeInTheDocument();
  });

  it('disables the row that issued an in-flight write', async () => {
    const user = userEvent.setup();
    mutationState = { isPending: true, isError: false, error: null };
    renderView();

    const target = screen.getByRole('button', {
      name: 'Link a session to 5k Time Trial',
    });
    await user.click(target);
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Session for 5k Time Trial' }),
      '70'
    );

    expect(target).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: 'Link a session to CP Test #1 (4-min)',
      })
    ).not.toBeDisabled();
  });
});
