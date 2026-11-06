import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  RHR_DEFAULT,
  HRV_DEFAULT,
  computeReadiness,
  computePersonalBaselines,
} from '../../utils/recoveryAnalytics.js';

// The home screen reads vitals through useVitals now, not the static
// recoveryLog constant.
const useVitalsMock = vi.fn();
vi.mock('../../hooks/useVitals.js', () => ({
  useVitals: () => useVitalsMock(),
}));

// CP/FTP labels read the live anchors rather than a hardcoded constant.
const useAnchorsMock = vi.fn();
vi.mock('../../hooks/useAnchors.js', () => ({
  useAnchors: () => useAnchorsMock(),
}));

// Intake comes from useNutritionDays (vitals intake columns). Synthetic data.
const useNutritionDaysMock = vi.fn();
vi.mock('../../hooks/useNutritionDays.js', () => ({
  useNutritionDays: () => useNutritionDaysMock(),
}));

import OverviewView from '../OverviewView.jsx';
import { THEME } from '../../constants/theme.js';

const vitalsRow = {
  date: '2026-08-21',
  rhr: RHR_DEFAULT,
  hrv: HRV_DEFAULT,
  sleep: 8,
};

beforeEach(() => {
  useAnchorsMock.mockReset();
  // Example CP — the live value is the rowing_cp anchor.
  useAnchorsMock.mockReturnValue({ cp: 200, ftp: 250, cpAvailable: true });
  useNutritionDaysMock.mockReset();
  useNutritionDaysMock.mockReturnValue({
    days: [],
    isLoading: false,
    isError: false,
  });
  useVitalsMock.mockReset();
  const personalBaselines = computePersonalBaselines([vitalsRow]);
  useVitalsMock.mockReturnValue({
    latest: vitalsRow,
    readiness: computeReadiness(vitalsRow, personalBaselines, -5),
    personalBaselines,
  });
});

const loadData = Array.from({ length: 14 }, (_, i) => ({
  date: `6/${i + 7}`,
  ctl: 55 + i * 0.5,
  atl: 60 + i * 0.4,
  tsb: -5 + i * 0.1,
  tss: 50,
}));

const loggedSessions = [
  {
    type: 'erg',
    label: 'UT2 60min',
    date: '6/19/26',
    srpe: 6,
    _isErg: true,
    distance_m: 12000,
    avg_watts: 150,
    avg_hr: 140,
    status: 'logged',
    done: true,
    note: 'steady aerobic',
  },
  {
    type: 'strength',
    label: 'Upper 1',
    date: '6/18/26',
    srpe: 7,
    exercises: ['Bench 3x5'],
    status: 'logged',
    done: true,
  },
  {
    type: 'bike',
    label: 'Z2 spin',
    date: '6/17/26',
    srpe: 4,
    status: 'logged',
  },
];

const baseProps = {
  latest: { tsb: -5, ctl: 62, atl: 67 },
  tsbColor: THEME.caution,
  loadData,
  loggedSessions,
  latestErg: loggedSessions[0],
  latestSquat: { e1rm: 118, date: '6/9' },
  totalErgDist: 55000,
  totalSessions: 20,
  isWide: true,
  nowTick: new Date('2026-06-20T08:00:00'),
};

describe('OverviewView', () => {
  it('scores readiness off live vitals, not a static log', () => {
    // A badly suppressed day must reach the home screen. Previously this read
    // the last entry of the recoveryLog constant, so the number was frozen in
    // June no matter what the athlete's actual vitals said.
    const bad = { ...vitalsRow, rhr: RHR_DEFAULT + 20 };
    const personalBaselines = computePersonalBaselines([bad]);
    useVitalsMock.mockReturnValue({
      latest: bad,
      readiness: computeReadiness(bad, personalBaselines, -5),
      personalBaselines,
    });
    render(<OverviewView {...baseProps} />);
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('shows a dash for readiness when there is no vitals reading', () => {
    useVitalsMock.mockReturnValue({
      latest: null,
      readiness: computeReadiness(null, {}, null),
      personalBaselines: computePersonalBaselines([]),
    });
    render(<OverviewView {...baseProps} />);
    expect(screen.getByText(/readiness\s+—/)).toBeInTheDocument();
  });

  it('labels load against the live CP/FTP anchors, not a hardcoded value', () => {
    render(<OverviewView {...baseProps} />);
    expect(screen.getByText(/Rowing CP 200W/)).toBeInTheDocument();
  });

  it('quotes the CP and FTP anchors with their status in the load note', () => {
    useAnchorsMock.mockReturnValue({
      cp: 200,
      cpStatus: 'provisional',
      ftp: 250,
      ftpStatus: 'confirmed',
      cpAvailable: true,
    });
    render(<OverviewView {...baseProps} />);
    expect(
      screen.getByText(
        /rowing CP 200W \(provisional\) and bike FTP 250W \(confirmed\)/
      )
    ).toBeInTheDocument();
  });

  it('says CP is unavailable rather than showing a stale threshold', () => {
    useAnchorsMock.mockReturnValue({
      cp: null,
      ftp: null,
      cpAvailable: false,
    });
    render(<OverviewView {...baseProps} />);
    expect(screen.getByText('CP unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/CP \d+W/)).not.toBeInTheDocument();
  });

  it('says the training load is unavailable rather than showing a zero', () => {
    // `latest` is null whenever the training-load read fails or comes back
    // empty. The tiles must not render a number, and nothing may claim a form
    // status — a fabricated 0 would read as a confident "neutral".
    render(
      <OverviewView {...baseProps} latest={null} loadUnavailable={true} />
    );
    expect(screen.getByText('TRAINING LOAD UNAVAILABLE')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/form status unknown/i)).toBeInTheDocument();
    expect(screen.queryByText(/Fresh — good form/)).not.toBeInTheDocument();
  });

  it('does not show the outage line while the read is still pending', () => {
    // loadUnavailable is false during a pending first read (#196).
    render(
      <OverviewView {...baseProps} latest={null} loadUnavailable={false} />
    );
    expect(
      screen.queryByText('TRAINING LOAD UNAVAILABLE')
    ).not.toBeInTheDocument();
  });

  it('renders the overview dashboard without crashing', () => {
    const { container } = render(<OverviewView {...baseProps} />);
    expect(container.textContent.length).toBeGreaterThan(200);
  });

  it('renders the fresh (positive-TSB) narrative', () => {
    const { container } = render(
      <OverviewView
        {...baseProps}
        latest={{ tsb: 8, ctl: 62, atl: 54 }}
        tsbColor={THEME.positive}
      />
    );
    expect(container.textContent.length).toBeGreaterThan(200);
  });

  it('renders in the narrow (mobile) layout', () => {
    const { container } = render(
      <OverviewView {...baseProps} isWide={false} />
    );
    expect(container.textContent.length).toBeGreaterThan(200);
  });

  it('handles an empty session history without crashing', () => {
    const { container } = render(
      <OverviewView {...baseProps} loggedSessions={[]} />
    );
    expect(container.textContent.length).toBeGreaterThan(50);
  });

  describe('nutrition status', () => {
    const targets = {
      training: {
        cal: [2000, 2400],
        protein: [150, 170],
        carbs: [200, 260],
        fat: [60, 80],
      },
    };
    const days = [
      {
        date: '2026-01-02',
        dayType: 'training',
        cal: 2200,
        protein: 160,
        carbs: 230,
        fat: 70,
        burn: 2500,
        weight: null,
        note: null,
      },
      {
        date: '2026-01-01',
        dayType: 'training',
        cal: 1500,
        protein: 100,
        carbs: 150,
        fat: 40,
        burn: null,
        weight: null,
        note: null,
      },
    ];

    it('says no intake is logged on a fresh DB', () => {
      render(<OverviewView {...baseProps} />);
      expect(screen.getByText('No intake logged')).toBeInTheDocument();
      expect(screen.getByText('targets anchor not set')).toBeInTheDocument();
    });

    it('shows loading and error states', () => {
      useNutritionDaysMock.mockReturnValue({
        days: [],
        isLoading: true,
        isError: false,
      });
      const { unmount } = render(<OverviewView {...baseProps} />);
      expect(screen.getByText(/Loading intake/)).toBeInTheDocument();
      unmount();
      useNutritionDaysMock.mockReturnValue({
        days: [],
        isLoading: false,
        isError: true,
      });
      render(<OverviewView {...baseProps} />);
      expect(screen.getByText(/Intake unavailable/)).toBeInTheDocument();
    });

    it('judges intake against the nutrition_targets anchor', () => {
      useAnchorsMock.mockReturnValue({
        cp: 200,
        ftp: 250,
        cpAvailable: true,
        nutritionTargets: targets,
      });
      useNutritionDaysMock.mockReturnValue({
        days,
        isLoading: false,
        isError: false,
      });
      render(<OverviewView {...baseProps} />);
      const rows = screen.getAllByTestId('nutrition-day');
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveTextContent('2000–2400');
      expect(rows[0]).toHaveTextContent('✅');
      expect(rows[0]).toHaveTextContent('Intake 2200 − burn ~2500');
      expect(rows[1]).toHaveTextContent('❌');
      expect(
        screen.getByText('vs nutrition_targets anchor')
      ).toBeInTheDocument();
    });

    it('shows raw intake without a verdict when no targets anchor is set', () => {
      useNutritionDaysMock.mockReturnValue({
        days,
        isLoading: false,
        isError: false,
      });
      render(<OverviewView {...baseProps} />);
      const rows = screen.getAllByTestId('nutrition-day');
      expect(rows[0]).toHaveTextContent('2200');
      expect(rows[0]).toHaveTextContent('160g');
      expect(rows[0]).not.toHaveTextContent('✅');
      expect(rows[1]).not.toHaveTextContent('❌');
      expect(screen.getByText('targets anchor not set')).toBeInTheDocument();
    });
  });
});
