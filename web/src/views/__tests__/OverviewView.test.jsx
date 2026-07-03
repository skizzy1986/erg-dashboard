import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import OverviewView from '../OverviewView.jsx';

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
