import { describe, it, expect, vi } from 'vitest';
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
vi.mock('../views/OverviewView.jsx', () => ({
  default: () => <div>OverviewView-stub</div>,
}));
vi.mock('../views/ProgramView.jsx', () => ({
  default: () => <div>ProgramView-stub</div>,
}));
vi.mock('../views/CalendarView.jsx', () => ({
  default: () => <div>CalendarView-stub</div>,
}));
vi.mock('../views/PlanView.jsx', () => ({
  default: () => <div>PlanView-stub</div>,
}));
vi.mock('../views/LogView.jsx', () => ({
  default: () => <div>LogView-stub</div>,
}));

import App from '../App.jsx';

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

  it('updates the responsive layout on window resize', async () => {
    render(<App />);
    await screen.findByText('OverviewView-stub');

    window.innerWidth = 500;
    fireEvent(window, new window.Event('resize'));

    expect(screen.getByText('SPLITIQ')).toBeInTheDocument();
  }, 30000);
});
