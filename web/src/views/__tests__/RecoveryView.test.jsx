import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import {
  RHR_DEFAULT as RHR_BASELINE,
  HRV_DEFAULT as HRV_BASELINE,
  computeReadiness,
  computePersonalBaselines,
} from '../../utils/recoveryAnalytics.js';

// Vitals now come from useVitals, not the static recoveryLog constant.
// LIPID_REF / HORMONE_REF / NIGGLES / bpLog / bloodsLog stay real.
const useVitalsMock = vi.fn();
vi.mock('../../hooks/useVitals.js', () => ({
  useVitals: () => useVitalsMock(),
}));

import { LIPID_REF, HORMONE_REF, NIGGLES } from '../../constants/logs.js';
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

beforeEach(() => {
  cleanup();
  useVitalsMock.mockReset();
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

  it('renders each tracked niggle', () => {
    renderView();
    for (const n of NIGGLES) {
      expect(screen.getByText(n.area)).toBeInTheDocument();
    }
  });

  it('exercises the positive-TSB narrative branch', () => {
    renderView({ tsb: 7 });
    expect(screen.getByText(/READINESS ·/)).toBeInTheDocument();
    expect(screen.getByText(/training load \(TSB/)).toBeInTheDocument();
  });
});
