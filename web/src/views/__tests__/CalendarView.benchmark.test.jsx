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

// Real rows, live labels. Session 61's date sorts ABOVE 45's under the text
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
  });

  it('clears the 5k badge when the trial is logged as 5,000m', async () => {
    mockSessions([
      ...PAYLOAD,
      { id: 25, date: '8/3/26', label: 'PM — 5,000m', status: 'completed' },
    ]);
    renderView();

    await waitFor(() => expect(fromMock).toHaveBeenCalledWith('sessions'));
    await waitFor(() =>
      expect(screen.queryByText(/^OVERDUE/)).not.toBeInTheDocument()
    );
  });
});
