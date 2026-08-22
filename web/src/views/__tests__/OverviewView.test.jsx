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

import OverviewView from '../OverviewView.jsx';

const vitalsRow = {
  date: '2026-08-21',
  rhr: RHR_DEFAULT,
  hrv: HRV_DEFAULT,
  sleep: 8,
};

beforeEach(() => {
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
  tsbColor: '#ffd700',
  loadData,
  loggedSessions,
  latestErg: loggedSessions[0],
  latestSquat: { e1rm: 118, date: '6/9' },
  totalErgDist: 55000,
  totalSessions: 20,
  ftp: 190,
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
        tsbColor="#34d399"
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
});
