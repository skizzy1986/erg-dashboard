import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// Live ids and labels; session 61's status is the counterfactual under test
// (it is cancelled in the table). Its date sorts ABOVE 45's under the text
// ordering the server applies, so this is the payload order the app receives.
const PAYLOAD = [
  {
    id: 61,
    date: '7/5/26',
    label: 'CP RETEST — 1min + 4min max (rested, fed)',
    status: 'completed',
  },
  {
    id: 45,
    date: '6/23/26',
    label: 'CP Test - 4min MAX (GATED)',
    status: 'completed',
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

beforeEach(() => {
  fromMock.mockReset();
});

describe('CalendarView + useBenchmarkStatuses (integration, unmocked hook)', () => {
  // Every ladder window below is in the past for any real "today" from
  // 2026-08-20 on, so the outcome does not drift with the wall clock. The day
  // count inside the badge does, hence the prefix match.
  it('badges only the 5k Time Trial row once both CP tests are accounted for', async () => {
    mockSessions(PAYLOAD);
    renderView();

    const badge = await screen.findByText(/^OVERDUE/);
    expect(badge.parentElement.textContent).toContain('5k Time Trial');
    expect(screen.getAllByText(/^OVERDUE/)).toHaveLength(1);
  });

  it('badges CP Test #2 as well when its retest was cancelled', async () => {
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
  // Test #2 overdue gives the wait something real to settle on: pre-fix, the 5k
  // is still overdue too and the count is 2.
  it('clears only the 5k badge when the trial is logged as 5,000m', async () => {
    mockSessions([
      { ...PAYLOAD[0], status: 'cancelled' },
      PAYLOAD[1],
      { id: 25, date: '8/3/26', label: 'PM — 5,000m', status: 'completed' },
    ]);
    renderView();

    const badges = await screen.findAllByText(/^OVERDUE/);
    expect(badges).toHaveLength(1);
    expect(badges[0].parentElement.textContent).toContain('CP Test #2');

    const badged = badges.map((b) => b.parentElement.textContent).join('|');
    expect(badged).not.toContain('5k Time Trial');
  });
});
