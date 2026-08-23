import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const fromMock = vi.fn();

// Supabase is mocked at the module boundary and NOTHING ELSE is — the real
// useBenchmarkStatuses, the real resolver and the real badge all run. The
// sibling CalendarView.test.jsx mocks the hook to pin badge rendering against
// hand-built states; this one proves the whole chain actually joins up, which
// is the seam the shipped defect slipped through.
vi.mock('../../supabaseClient.js', () => ({
  supabase: { from: (...args) => fromMock(...args) },
}));

import CalendarView from '../CalendarView.jsx';

// Live ids and labels, now carrying explicit links (#188). Session 61's status
// is the counterfactual under test (it is cancelled in the table). Its date
// sorts ABOVE 45's under the text ordering the server applies, so this is the
// payload order the app receives — and the outcome no longer depends on it,
// because the resolver keys on benchmark_key and never reads sessions.date.
const PAYLOAD = [
  {
    id: 61,
    date: '7/5/26',
    label: 'CP RETEST — 1min + 4min max (rested, fed)',
    status: 'completed',
    benchmark_key: 'cp-test-2',
  },
  {
    id: 45,
    date: '6/23/26',
    label: 'CP Test - 4min MAX (GATED)',
    status: 'completed',
    benchmark_key: 'cp-test-1',
  },
];

function mockSessions(data) {
  fromMock.mockImplementation(() => {
    const chain = {
      select: () => chain,
      order: () => chain,
      limit: () => Promise.resolve({ data, error: null }),
    };
    return chain;
  });
}

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

// The ladder panel's rows in DOM order, so severity ordering can be asserted
// on the real surface rather than on the resolver's output.
function ladderRowTexts() {
  const heading = screen.getByText(/UPCOMING EVENTS · SEASON 1 LADDER/i);
  return Array.from(heading.parentElement.children)
    .filter((el) => el !== heading)
    .map((el) => el.textContent);
}

beforeEach(() => {
  fromMock.mockReset();
});

describe('CalendarView + useBenchmarkStatuses (integration, unmocked hook)', () => {
  // The clock is pinned. These OVERDUE counts used to be wall-clock stable for
  // a reason that no longer holds: the panel rendered only EVENT_LADDER[0..4],
  // whose windows are all 2026 and all elapsed. Since #228 the whole ladder
  // renders, so the 2k Test (~Mid Jan 27) and the tune-ups (Late Jan 27) join
  // it — and every count below would silently go 1 -> 3 and 2 -> 4 once those
  // windows elapse in early 2027. Verified by running this file at 2027-02-15:
  // five tests fail. Pinned to the same date the reschedule block uses.
  // The day count inside the badge still varies, hence the prefix match.
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 7, 22));
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  it('badges only the 5k Time Trial row once both CP tests are linked', async () => {
    mockSessions(PAYLOAD);
    renderView();

    const badge = await screen.findByText(/^OVERDUE/);
    expect(badge.parentElement.textContent).toContain('5k Time Trial');
    expect(screen.getAllByText(/^OVERDUE/)).toHaveLength(1);
  });

  it('badges CP Test #2 as well when its linked retest was cancelled', async () => {
    mockSessions([{ ...PAYLOAD[0], status: 'cancelled' }, PAYLOAD[1]]);
    renderView();

    await waitFor(() =>
      expect(screen.getAllByText(/^OVERDUE/)).toHaveLength(2)
    );
    const rows = screen
      .getAllByText(/^OVERDUE/)
      .map((b) => b.parentElement.textContent);
    expect(rows[0]).toContain('CP Test #2 (2nd duration)');
    expect(rows[1]).toContain('5k Time Trial');
  });

  it('shows no badge at all while the sessions query is still pending', () => {
    fromMock.mockImplementation(() => {
      const chain = {
        select: () => chain,
        order: () => chain,
        limit: () => new Promise(() => {}),
      };
      return chain;
    });
    renderView();
    expect(screen.queryByText(/OVERDUE/)).not.toBeInTheDocument();
    expect(screen.getByText(/UPCOMING EVENTS/i)).toBeInTheDocument();
    // Pending is not unavailable. A slow first read must not flash the outage
    // line and then replace it with badges.
    expect(screen.queryByText(/UNAVAILABLE/i)).not.toBeInTheDocument();
  });

  // A failed read resolves every entry to `unknown`, which renders no badge.
  // Silence is exactly what "no benchmarks due" looks like, so an outage that
  // says nothing is the feature's own failure mode arriving by another door.
  it('says so when the sessions read fails, instead of rendering silence', async () => {
    fromMock.mockImplementation(() => {
      const chain = {
        select: () => chain,
        order: () => chain,
        limit: () => Promise.resolve({ data: null, error: new Error('nope') }),
      };
      return chain;
    });
    renderView();

    expect(
      await screen.findByText(/BENCHMARK STATUS UNAVAILABLE/i)
    ).toBeInTheDocument();
    // The ladder itself still renders; only the benchmark verdicts are unknown.
    expect(screen.getByText(/UPCOMING EVENTS/i)).toBeInTheDocument();
    expect(screen.queryByText(/^OVERDUE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^DUE/)).not.toBeInTheDocument();
  });

  it('shows no outage line once the read succeeds', async () => {
    mockSessions(PAYLOAD);
    renderView();

    await screen.findByText(/^OVERDUE/);
    expect(screen.queryByText(/UNAVAILABLE/i)).not.toBeInTheDocument();
  });

  // Waits on a POSITIVE render before asserting the 5k's badge is gone. An
  // absence assertion on its own satisfies on the first tick while the query is
  // still pending — it passes against an empty payload and against the pre-fix
  // code, which is the toothless shape this file exists to prevent. Leaving CP
  // Test #2 overdue gives the wait something real to settle on: without the
  // link, the 5k is still overdue too and the count is 2.
  it('clears only the 5k badge when a session carries benchmark_key 5k-tt', async () => {
    mockSessions([
      { ...PAYLOAD[0], status: 'cancelled' },
      PAYLOAD[1],
      {
        id: 25,
        date: '8/3/26',
        label: 'PM — steady 5,000m',
        status: 'completed',
        benchmark_key: '5k-tt',
      },
    ]);
    renderView();

    const badges = await screen.findAllByText(/^OVERDUE/);
    expect(badges).toHaveLength(1);
    expect(badges[0].parentElement.textContent).toContain('CP Test #2');

    const badged = badges.map((b) => b.parentElement.textContent).join('|');
    expect(badged).not.toContain('5k Time Trial');
  });

  // AC3, at the view. The label is the strongest possible keyword match for the
  // 5k, and it clears nothing, because nothing links it.
  it('leaves the 5k overdue when a session names it but carries no link', async () => {
    mockSessions([
      PAYLOAD[0],
      PAYLOAD[1],
      {
        id: 26,
        date: '8/3/26',
        label: '5k Time Trial — 5,000m',
        status: 'completed',
        benchmark_key: null,
      },
    ]);
    renderView();

    const badges = await screen.findAllByText(/^OVERDUE/);
    expect(badges).toHaveLength(1);
    expect(badges[0].parentElement.textContent).toContain('5k Time Trial');
  });
});

// Rescheduling end-to-end: a `planned` row on the calendar is the whole gesture
// — no button, no write, no new hook. The chain under test is the same one the
// sibling cases use, extended by one pass.
describe('CalendarView + a rescheduled benchmark (integration)', () => {
  // Session 61 cancelled leaves CP Test #2 overdue, which is the only state a
  // planned row is allowed to move.
  const CP2_OVERDUE = [{ ...PAYLOAD[0], status: 'cancelled' }, PAYLOAD[1]];
  const RETEST_LABEL = 'CP RETEST — 1min + 4min max';

  // Pinned for the same reason as the block above, plus one of its own: a
  // FUTURE planned date is future only relative to the real clock — unpinned,
  // this pair would silently invert on 12 Sep 2026 rather than keep testing
  // what it was written to test.
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 7, 22));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('AC2 badges CP Test #2 as rescheduled and sorts it below the 5k', async () => {
    mockSessions([
      ...CP2_OVERDUE,
      { id: 300, date: '9/12/26', label: RETEST_LABEL, status: 'planned' },
    ]);
    renderView();

    const badge = await screen.findByText(/^↻ RESCHEDULED/);
    expect(badge.textContent).toContain('9/12/26');
    expect(badge.parentElement.textContent).toContain(
      'CP Test #2 (2nd duration)'
    );

    const overdue = screen.getAllByText(/^OVERDUE/);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].parentElement.textContent).toContain('5k Time Trial');

    const rows = ladderRowTexts();
    expect(rows[0]).toContain('5k Time Trial');
    expect(rows[1]).toContain('CP Test #2 (2nd duration)');
  });

  it('AC3 leaves both badges overdue when the planned session is in the past', async () => {
    mockSessions([
      ...CP2_OVERDUE,
      { id: 300, date: '7/12/26', label: RETEST_LABEL, status: 'planned' },
    ]);
    renderView();

    await waitFor(() =>
      expect(screen.getAllByText(/^OVERDUE/)).toHaveLength(2)
    );
    expect(screen.queryByText(/RESCHEDULED/)).not.toBeInTheDocument();
  });
});
