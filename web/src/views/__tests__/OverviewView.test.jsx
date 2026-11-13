import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

// CP/FTP labels read the live anchors rather than a hardcoded 190.
const useAnchorsMock = vi.fn();
vi.mock('../../hooks/useAnchors.js', () => ({
  useAnchors: () => useAnchorsMock(),
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
  useAnchorsMock.mockReturnValue({
    anchors: {},
    cp: 205,
    ftp: 250,
    cpAvailable: true,
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
  totalErgDist: 55000,
  totalSessions: 20,
  isWide: true,
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
    const card = within(screen.getByRole('region', { name: 'Readiness' }));
    expect(card.getByText('20')).toBeInTheDocument();
  });

  it('shows a dash for readiness when there is no vitals reading', () => {
    useVitalsMock.mockReturnValue({
      latest: null,
      readiness: computeReadiness(null, {}, null),
      personalBaselines: computePersonalBaselines([]),
    });
    render(<OverviewView {...baseProps} />);
    const card = within(screen.getByRole('region', { name: 'Readiness' }));
    expect(card.getByText('—')).toBeInTheDocument();
  });

  it('renders no roster text now that the today strip is gone', () => {
    // \s keeps the cull guard's needle out of this file.
    render(<OverviewView {...baseProps} />);
    expect(
      screen.queryByText(/YOUR\sWEEKS|FIFO|not logged|SWAPPED/i)
    ).toBeNull();
  });

  it('labels load against the live CP/FTP anchors, not a hardcoded 190', () => {
    render(<OverviewView {...baseProps} />);
    expect(screen.getByText(/Rowing CP 205W/)).toBeInTheDocument();
    expect(screen.queryByText(/190W/)).not.toBeInTheDocument();
  });

  it('says CP is unavailable rather than showing a stale threshold', () => {
    useAnchorsMock.mockReturnValue({
      anchors: {},
      cp: null,
      ftp: null,
      cpAvailable: false,
    });
    render(<OverviewView {...baseProps} />);
    expect(screen.getByText('CP unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/190W/)).not.toBeInTheDocument();
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
    expect(screen.queryByText(/Fresh —/)).not.toBeInTheDocument();
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
        latest={{ tsb: 15, ctl: 62, atl: 47 }}
        tsbColor={THEME.positive}
      />
    );
    expect(container.textContent.length).toBeGreaterThan(200);
    expect(
      screen.getByText('✅ Fresh — form positive; recent load below fitness')
    ).toBeInTheDocument();
  });

  // The band copy describes the load; it never tells the athlete what to do.
  it.each([
    [-5, '⚡ Neutral — recent load and fitness balanced'],
    [-15, '⚠️ Fatigued — recent load above fitness'],
    [-40, '🔴 High fatigue — recent load well above fitness'],
  ])('describes TSB %i without prescribing', (tsb, copy) => {
    render(<OverviewView {...baseProps} latest={{ tsb, ctl: 60, atl: 60 }} />);
    expect(screen.getByText(copy)).toBeInTheDocument();
    expect(
      screen.queryByText(/rest day|Thursday|add sessions|ready for/i)
    ).toBeNull();
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

  describe('training phase', () => {
    const withAnchors = (anchors) =>
      useAnchorsMock.mockReturnValue({
        anchors,
        cp: 205,
        ftp: 250,
        cpAvailable: true,
      });

    it('(a) claims no phase when the anchor is unset', () => {
      render(<OverviewView {...baseProps} />);
      expect(screen.queryByLabelText('Training phase')).toBeNull();
      expect(screen.queryByText(/Phase 1|BASE/i)).toBeNull();
    });

    it('(b) shows no pill for a block without a phase', () => {
      withAnchors({ current_block: { value: 'wk 3/12' } });
      render(<OverviewView {...baseProps} />);
      expect(screen.queryByLabelText('Training phase')).toBeNull();
      expect(screen.queryByText(/WK 3\/12/i)).toBeNull();
    });

    it('(c) renders only the anchor values when a phase is set', () => {
      withAnchors({
        current_phase: { value: 'Base' },
        current_block: { value: 'wk 3/12' },
      });
      const { container } = render(<OverviewView {...baseProps} />);
      expect(screen.getByLabelText('Training phase')).toHaveTextContent(
        /^BASE · WK 3\/12$/
      );
      // Nothing from the hardcoded phase card it replaces.
      expect(container.textContent).not.toMatch(
        /Phase 1|Extended|Jun–Aug|BUILD 1|PEAK|aerobic engine|benchmark/i
      );
    });
  });

  it('(d) renders the load chart with the current CTL, ATL and TSB', () => {
    render(<OverviewView {...baseProps} />);
    expect(screen.getByText('TRAINING LOAD')).toBeInTheDocument();
    const tile = (k) => within(screen.getByText(k).parentElement);
    expect(tile('CTL').getByText('62')).toBeInTheDocument();
    expect(tile('ATL').getByText('67')).toBeInTheDocument();
    expect(tile('TSB').getByText('-5')).toBeInTheDocument();
  });

  it('(e) shows both unavailable states together when CP and load are null', () => {
    useAnchorsMock.mockReturnValue({
      anchors: {},
      cp: null,
      ftp: null,
      cpAvailable: false,
    });
    render(
      <OverviewView {...baseProps} latest={null} loadUnavailable={true} />
    );
    expect(screen.getByText('TRAINING LOAD UNAVAILABLE')).toBeInTheDocument();
    expect(screen.getByText('CP unavailable')).toBeInTheDocument();
    expect(screen.getByText(/CP anchor cannot be read/)).toBeInTheDocument();
  });

  it('(f) scores readiness off population defaults below 14 samples', () => {
    const personalBaselines = computePersonalBaselines([vitalsRow]);
    expect(personalBaselines.rhrPersonal).toBe(false);
    const expected = computeReadiness(vitalsRow, {}, -5);
    expect(expected.score).not.toBeNull();
    expect(computeReadiness(vitalsRow, personalBaselines, -5).score).toBe(
      expected.score
    );
    render(<OverviewView {...baseProps} />);
    const card = within(screen.getByRole('region', { name: 'Readiness' }));
    expect(card.getByText(String(expected.score))).toBeInTheDocument();
  });

  it('(g) carries no prescription, rules, nutrition or strength surface', () => {
    const { container } = render(<OverviewView {...baseProps} />);
    expect(container.textContent).not.toMatch(
      /ADAPTIVE|PRESCRIPTION|NUTRITION|SEQUENCING|e1RM/i
    );
  });

  it('shows three stat tiles', () => {
    render(<OverviewView {...baseProps} />);
    for (const k of ['SESSIONS LOGGED', 'ERG DISTANCE', 'LATEST WATTS'])
      expect(screen.getByText(k)).toBeInTheDocument();
    expect(
      screen.getByText('SESSIONS LOGGED').parentElement.parentElement
    ).toHaveStyle({ gridTemplateColumns: 'repeat(3,1fr)' });
  });
});
