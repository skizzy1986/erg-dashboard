import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import {
  RHR_DEFAULT as RHR_BASELINE,
  HRV_DEFAULT as HRV_BASELINE,
  computeReadiness,
  computePersonalBaselines,
} from '../../utils/recoveryAnalytics.js';

// Vitals come from useVitals; BP from useBpReadings; niggles and the private
// health context from useAnchors. LIPID_REF / HORMONE_REF stay real (generic
// reference data). Every hook-fed string below is synthetic.
const useVitalsMock = vi.fn();
vi.mock('../../hooks/useVitals.js', () => ({
  useVitals: () => useVitalsMock(),
}));
const useBpMock = vi.fn();
vi.mock('../../hooks/useBpReadings.js', () => ({
  useBpReadings: () => useBpMock(),
}));
const useAnchorsMock = vi.fn();
vi.mock('../../hooks/useAnchors.js', () => ({
  useAnchors: () => useAnchorsMock(),
}));

import * as logs from '../../constants/logs.js';
import { LIPID_REF, HORMONE_REF } from '../../constants/logs.js';
import RecoveryView from '../RecoveryView.jsx';

const day = (over = {}) => ({
  date: '2026-06-20',
  rhr: RHR_BASELINE,
  hrv: HRV_BASELINE,
  sleep: 8,
  sleepScore: 85,
  ...over,
});

// Build the hook's real return shape from rows, so these tests exercise the
// actual readiness maths rather than a hand-written score.
const setRows = (rows, tsbNow = 0) => {
  const latest = rows[0] ?? null;
  const personalBaselines = computePersonalBaselines(rows);
  const readiness = computeReadiness(latest, personalBaselines, tsbNow);
  useVitalsMock.mockReturnValue({
    latest,
    readiness,
    readinessScore: readiness.score,
    readinessLabel: readiness.status,
    personalBaselines,
    tsbNow,
    vitalsHistory: rows.slice().reverse(),
    history: [],
    hasPersonalBaselines:
      personalBaselines.rhrPersonal && personalBaselines.hrvPersonal,
    isLoading: false,
    isError: false,
  });
};
const renderView = () => render(<RecoveryView isWide={true} />);

const bpState = (over = {}) => ({
  readings: [],
  isLoading: false,
  isError: false,
  ...over,
});
const anchorsState = (over = {}) => ({
  anchors: {},
  niggles: [],
  isLoading: false,
  isError: false,
  ...over,
});

beforeEach(() => {
  cleanup();
  useVitalsMock.mockReset();
  useBpMock.mockReset();
  useAnchorsMock.mockReset();
  useBpMock.mockReturnValue(bpState());
  useAnchorsMock.mockReturnValue(anchorsState());
  setRows([day(), day({ date: '2026-06-19' }), day({ date: '2026-06-18' })]);
});

describe('RecoveryView', () => {
  it('says vitals are unavailable when the read returns nothing', () => {
    setRows([]);
    renderView();
    expect(screen.getByText('VITALS UNAVAILABLE')).toBeInTheDocument();
  });

  it('says loading, not unavailable, while the first read is pending', () => {
    setRows([]);
    useVitalsMock.mockReturnValue({
      ...useVitalsMock(),
      isLoading: true,
    });
    renderView();
    expect(screen.getByText(/Loading vitals/i)).toBeInTheDocument();
    expect(screen.queryByText('VITALS UNAVAILABLE')).not.toBeInTheDocument();
  });

  it('renders the readiness composite and trend/log sections', () => {
    renderView();
    expect(screen.getByText(/READINESS ·/)).toBeInTheDocument();
    expect(screen.getByText(/RESTING HR TREND/)).toBeInTheDocument();
    expect(screen.getByText(/BLOOD PRESSURE/)).toBeInTheDocument();
    expect(screen.getByText(/NIGGLES · INJURY WATCH/)).toBeInTheDocument();
    expect(screen.getByText(/BLOODS · LIPID PANEL/)).toBeInTheDocument();
  });

  it('reports READY when vitals are at baseline', () => {
    setRows([day()]);
    renderView();
    expect(screen.getByText('READY')).toBeInTheDocument();
  });

  it('reports CAUTION on moderately elevated RHR', () => {
    setRows([day({ rhr: RHR_BASELINE + 6 })]); // 100 - 24 = 76
    renderView();
    expect(screen.getByText('CAUTION')).toBeInTheDocument();
  });

  it('reports FATIGUED when vitals are badly suppressed', () => {
    setRows([day({ rhr: RHR_BASELINE + 20 })]); // 100 - 80 = 20
    renderView();
    expect(screen.getByText('FATIGUED')).toBeInTheDocument();
  });

  it('says NO DATA rather than scoring a day with no RHR', () => {
    setRows([day({ rhr: null })]);
    renderView();
    expect(screen.getByText('NO DATA')).toBeInTheDocument();
    expect(screen.getByText(/nothing to score/i)).toBeInTheDocument();
  });

  it('labels a defaulted baseline as default, not as the athlete average', () => {
    // Three rows is far short of the 14 needed, so both baselines are the
    // population defaults and must not be presented as "your avg".
    setRows([day(), day({ date: '2026-06-19' }), day({ date: '2026-06-18' })]);
    renderView();
    expect(screen.getAllByText(/default \d/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/your avg/)).not.toBeInTheDocument();
  });

  it('handles a missing sleep score without crashing', () => {
    setRows([day({ sleepScore: null })]);
    renderView();
    expect(screen.getByText(/READINESS ·/)).toBeInTheDocument();
  });

  it('renders the lipid and hormone reference panels from constants', () => {
    renderView();
    for (const m of LIPID_REF) {
      expect(screen.getByText(m.marker)).toBeInTheDocument();
    }
    for (const h of HORMONE_REF) {
      expect(screen.getByText(h.marker)).toBeInTheDocument();
    }
  });

  it('renders each live niggle anchor', () => {
    useAnchorsMock.mockReturnValue(
      anchorsState({
        niggles: [
          {
            slug: 'example-a',
            label: 'Example niggle A',
            detail: 'Example guardrail A',
            status: 'provisional',
          },
          {
            slug: 'example-b',
            label: 'Example niggle B',
            detail: '',
            status: null,
          },
        ],
      })
    );
    renderView();
    expect(screen.getAllByTestId('niggle')).toHaveLength(2);
    expect(screen.getByText('Example niggle A')).toBeInTheDocument();
    expect(screen.getByText('Example guardrail A')).toBeInTheDocument();
    expect(
      screen.queryByText('No active niggles recorded')
    ).not.toBeInTheDocument();
  });

  it('says no active niggles when there are no niggle anchors', () => {
    renderView();
    expect(screen.getByText('No active niggles recorded')).toBeInTheDocument();
  });

  it('shows loading and error states for niggles', () => {
    useAnchorsMock.mockReturnValue(anchorsState({ isLoading: true }));
    renderView();
    expect(screen.getByText(/Loading niggles/)).toBeInTheDocument();
    cleanup();
    useAnchorsMock.mockReturnValue(anchorsState({ isError: true }));
    renderView();
    expect(screen.getByText(/Niggles unavailable/)).toBeInTheDocument();
  });

  it('renders BP readings from the hook, newest first as given', () => {
    useBpMock.mockReturnValue(
      bpState({
        readings: [
          {
            measuredAt: '2026-01-02T07:00:00Z',
            sys: 118,
            dia: 76,
            pulse: 60,
            context: 'example clean',
            clean: true,
          },
          {
            measuredAt: '2026-01-01T19:00:00Z',
            sys: 128,
            dia: 79,
            pulse: null,
            context: '',
            clean: false,
          },
        ],
      })
    );
    renderView();
    const rows = screen.getAllByTestId('bp-reading');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('118/76');
    expect(rows[0]).toHaveTextContent('example clean');
    expect(rows[1]).toHaveTextContent('Not a clean resting reading');
    expect(screen.queryByText('No readings yet')).not.toBeInTheDocument();
  });

  it('shows loading, error and empty BP states', () => {
    renderView();
    expect(screen.getByText('No readings yet')).toBeInTheDocument();
    cleanup();
    useBpMock.mockReturnValue(bpState({ isLoading: true }));
    renderView();
    expect(screen.getByText(/Loading readings/)).toBeInTheDocument();
    cleanup();
    useBpMock.mockReturnValue(bpState({ isError: true }));
    renderView();
    expect(screen.getByText(/BP readings unavailable/)).toBeInTheDocument();
  });

  it('renders the health_context anchor only when it is set', () => {
    renderView();
    expect(screen.queryByTestId('health-context')).not.toBeInTheDocument();
    cleanup();
    useAnchorsMock.mockReturnValue(
      anchorsState({
        anchors: {
          health_context: {
            key: 'health_context',
            value: 'Example private note',
          },
        },
      })
    );
    renderView();
    expect(screen.getByTestId('health-context')).toHaveTextContent(
      'Example private note'
    );
  });

  it('keeps the BP, bloods and niggle cards on a fresh DB with no vitals', () => {
    setRows([]);
    renderView();
    expect(screen.getByText('VITALS UNAVAILABLE')).toBeInTheDocument();
    expect(screen.getByText('No readings yet')).toBeInTheDocument();
    expect(screen.getByText('No active niggles recorded')).toBeInTheDocument();
    expect(screen.getByText(/BLOODS · LIPID PANEL/)).toBeInTheDocument();
  });

  it('no longer ships athlete records as constants', () => {
    for (const name of ['bpLog', 'bloodsLog', 'NIGGLES']) {
      expect(logs).not.toHaveProperty(name);
    }
  });

  it('exercises the positive-TSB narrative branch', () => {
    renderView({ tsb: 7 });
    expect(screen.getByText(/READINESS ·/)).toBeInTheDocument();
    expect(screen.getByText(/training load \(TSB/)).toBeInTheDocument();
  });
});
