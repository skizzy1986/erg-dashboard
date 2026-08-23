import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// App.jsx fetches sessions directly via the supabase client:
//   supabase.from('sessions').select('*').order('created_at', { ascending: false })
// The chain's terminal `.order()` is awaited as a thenable, so mock it to
// resolve with representative rows covering every render branch of the mapping.
const rows = [
  {
    id: 'erg-1',
    date: '7/9/26',
    type: 'erg',
    label: 'UT2 60min',
    duration: 3600,
    srpe: 4,
    prs: null,
    exercises: null,
    coach_note: 'steady',
    status: 'logged',
    distance_m: 12000,
    avg_watts: 150,
    avg_hr: 132,
  },
  {
    id: 'str-1',
    date: '7/8/26',
    type: 'strength',
    label: 'Upper A',
    duration: 2400,
    srpe: 6,
    prs: 'Bench PR',
    exercises: [{ name: 'Bench Press' }],
    coach_note: null,
    status: 'completed',
    distance_m: null,
    avg_watts: null,
    avg_hr: null,
  },
  {
    id: 'cyc-1',
    date: '7/12/26',
    type: 'cycling',
    label: 'Z2 ride',
    duration: 5400,
    srpe: null,
    prs: null,
    exercises: null,
    coach_note: null,
    status: 'planned',
    distance_m: null,
    avg_watts: null,
    avg_hr: null,
  },
  {
    id: 'cancel-1',
    date: '7/5/26',
    type: 'erg',
    label: 'CP RETEST — 1min + 4min max (rested, fed)',
    duration: 1800,
    srpe: null,
    prs: null,
    exercises: null,
    coach_note: null,
    status: 'cancelled',
    distance_m: null,
    avg_watts: null,
    avg_hr: null,
  },
  {
    id: 'test-1',
    date: '7/1/26',
    type: 'Test',
    label: 'CP test',
    duration: 600,
    srpe: null,
    prs: null,
    exercises: null,
    coach_note: null,
    status: 'completed',
    distance_m: null,
    avg_watts: null,
    avg_hr: null,
  },
];

vi.mock('../supabaseClient.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: rows, error: null }),
      }),
    }),
  },
}));

// Stub every child module App imports so the test drives App's own routing and
// mapping logic in isolation (utils + constants run for real).
vi.mock('../StrengthLogger.jsx', () => ({
  default: () => <div>StrengthLogger-stub</div>,
}));
vi.mock('../views/ErgLiveView.jsx', () => ({
  default: () => <div>ErgLiveView-stub</div>,
}));
vi.mock('../views/CoachView.jsx', () => ({
  default: () => <div>CoachView-stub</div>,
}));
vi.mock('../views/ErgView.jsx', () => ({
  default: () => <div>ErgView-stub</div>,
}));
vi.mock('../views/JournalView.jsx', () => ({
  default: () => <div>JournalView-stub</div>,
}));
vi.mock('../views/RecoveryView.jsx', () => ({
  default: () => <div>RecoveryView-stub</div>,
}));
vi.mock('../views/StrengthView.jsx', () => ({
  default: () => <div>StrengthView-stub</div>,
}));
vi.mock('../views/MobilityView.jsx', () => ({
  default: () => <div>MobilityView-stub</div>,
}));
// Surfaces the load props so a test can assert what App derived and passed
// down, rather than reaching into OverviewView's own rendering.
vi.mock('../views/OverviewView.jsx', () => ({
  default: ({
    latest,
    loadUnavailable,
    totalErgDist,
    ftp,
    loggedSessions,
    totalSessions,
  }) => (
    <div>
      OverviewView-stub
      <span data-testid="ctl">{latest ? latest.ctl : 'none'}</span>
      <span data-testid="tsb">{latest ? latest.tsb : 'none'}</span>
      <span data-testid="unavailable">{String(loadUnavailable)}</span>
      <span data-testid="ergdist">{String(totalErgDist)}</span>
      <span data-testid="ftp">{String(ftp)}</span>
      <span data-testid="overview-counted">{loggedSessions?.length}</span>
      <span data-testid="overview-total">{totalSessions}</span>
    </div>
  ),
}));
vi.mock('../views/ProgramView.jsx', () => ({
  default: () => <div>ProgramView-stub</div>,
}));
vi.mock('../views/CalendarView.jsx', () => ({
  default: (props) => (
    <div>
      <div>CalendarView-stub</div>
      <div data-testid="calendar-counted">{props.loggedSessions?.length}</div>
    </div>
  ),
}));
vi.mock('../views/PlanView.jsx', () => ({
  default: () => <div>PlanView-stub</div>,
}));
vi.mock('../views/LogView.jsx', () => ({
  default: (props) => (
    <div>
      <div>LogView-stub</div>
      <div data-testid="logview-shown">{props.logDisplaySessions?.length}</div>
    </div>
  ),
}));

// App reads CTL/ATL/TSB through useTSSHistory (react-query + supabase). Mock it
// so these tests stay about App's own wiring, and so each case can choose
// between a live series, an empty read, and a still-pending one.
const tssHistoryMock = vi.fn();
vi.mock('../hooks/useTSSHistory.js', () => ({
  useTSSHistory: () => tssHistoryMock(),
}));

import App from '../App.jsx';

// Two sessions on consecutive days, in classic TSS units.
const LIVE_TSS = [
  { date: '8/5/26', tss: 55 },
  { date: '8/6/26', tss: 70 },
];

beforeEach(() => {
  tssHistoryMock.mockReset();
  tssHistoryMock.mockReturnValue({
    data: LIVE_TSS,
    isLoading: false,
    isError: false,
  });
});

// nav label (uppercased) → the stub marker its branch renders.
const NAV = [
  ['OVERVIEW', 'OverviewView-stub'],
  ['CALENDAR', 'CalendarView-stub'],
  ['PROGRAM', 'ProgramView-stub'],
  ['PLAN', 'PlanView-stub'],
  ['LIVE', 'ErgLiveView-stub'],
  ['ERG', 'ErgView-stub'],
  ['STRENGTH', 'StrengthView-stub'],
  ['LOGGER', 'StrengthLogger-stub'],
  ['MOBILITY', 'MobilityView-stub'],
  ['RECOVERY', 'RecoveryView-stub'],
  ['LOG', 'LogView-stub'],
  ['JOURNAL', 'JournalView-stub'],
  ['COACH', 'CoachView-stub'],
];

describe('App', () => {
  it('renders the header, full nav, and routes every tab to its view', async () => {
    render(<App />);

    // Wait for the async fetch to settle so the row mapping runs inside act().
    expect(await screen.findByText('OverviewView-stub')).toBeInTheDocument();

    expect(screen.getByText('SPLITIQ')).toBeInTheDocument();

    for (const [label] of NAV) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }

    for (const [label, marker] of NAV) {
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(screen.getByText(marker)).toBeInTheDocument();
    }
  }, 30000);

  it('derives CTL/ATL/TSB from the live session history, not a static seed', async () => {
    render(<App />);
    await screen.findByText('OverviewView-stub');

    // calcTrainingLoad walks day-by-day to today and decays, so the exact value
    // moves with the clock. What matters is that a real series produced a real
    // reading and the view was not told the data is unavailable.
    expect(screen.getByTestId('ctl').textContent).not.toBe('none');
    expect(Number(screen.getByTestId('ctl').textContent)).toBeGreaterThan(0);
    expect(screen.getByTestId('unavailable').textContent).toBe('false');
  }, 30000);

  it('says the load is unavailable rather than rendering a fabricated zero', async () => {
    tssHistoryMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
    });
    render(<App />);
    await screen.findByText('OverviewView-stub');

    expect(screen.getByTestId('ctl').textContent).toBe('none');
    expect(screen.getByTestId('tsb').textContent).toBe('none');
    expect(screen.getByTestId('unavailable').textContent).toBe('true');
  }, 30000);

  it('treats a still-pending first read as pending, not unavailable', async () => {
    // A slow read must not flash an outage line and then replace it with real
    // numbers (#196) — no reading yet, but nothing is claimed to be broken.
    tssHistoryMock.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    });
    render(<App />);
    await screen.findByText('OverviewView-stub');

    expect(screen.getByTestId('ctl').textContent).toBe('none');
    expect(screen.getByTestId('unavailable').textContent).toBe('false');
  }, 30000);

  it('sums erg distance from the logged sessions instead of a hardcoded total', async () => {
    // The fixture carries one erg row at 12000m. This was `55000` regardless of
    // what had actually been logged.
    render(<App />);
    await screen.findByText('OverviewView-stub');
    expect(screen.getByTestId('ergdist').textContent).toBe('12000');
  }, 30000);

  it('no longer threads a hardcoded ftp down to the overview', async () => {
    // CP/FTP now come from the live anchors inside OverviewView.
    render(<App />);
    await screen.findByText('OverviewView-stub');
    expect(screen.getByTestId('ftp').textContent).toBe('undefined');
  }, 30000);

  it('R9 wires the shown list to LogView and the counted list to every counting consumer (#194)', async () => {
    // The regression this guards is a prop swap, not a filter bug: the hook can
    // be perfectly correct while App hands the wrong list to the wrong view.
    // Fixture: erg-1 logged + str-1 completed = 2 counted; + cancel-1 = 3 shown;
    // cyc-1 planned and test-1 (type 'Test') are excluded from both.
    render(<App />);
    await screen.findByText('OverviewView-stub');

    expect(screen.getByTestId('overview-counted')).toHaveTextContent('2');
    expect(screen.getByTestId('overview-total')).toHaveTextContent('2');

    fireEvent.click(screen.getByRole('button', { name: 'CALENDAR' }));
    expect(screen.getByTestId('calendar-counted')).toHaveTextContent('2');

    fireEvent.click(screen.getByRole('button', { name: 'LOG' }));
    expect(screen.getByTestId('logview-shown')).toHaveTextContent('3');
  }, 30000);

  it('updates the responsive layout on window resize', async () => {
    render(<App />);
    await screen.findByText('OverviewView-stub');

    window.innerWidth = 500;
    fireEvent(window, new window.Event('resize'));

    expect(screen.getByText('SPLITIQ')).toBeInTheDocument();
  }, 30000);
});
