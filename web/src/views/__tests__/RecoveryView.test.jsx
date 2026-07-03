import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { RHR_BASELINE, HRV_BASELINE } from '../../constants/trainingConfig.js';

// Drive the readiness branches by controlling the last recoveryLog entry.
// LIPID_REF / HORMONE_REF / NIGGLES / bpLog / bloodsLog stay real.
const { recRows } = vi.hoisted(() => ({ recRows: [] }));
vi.mock('../../constants/logs.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, recoveryLog: recRows };
});

import { LIPID_REF, HORMONE_REF, NIGGLES } from '../../constants/logs.js';
import RecoveryView from '../RecoveryView.jsx';

const day = (over = {}) => ({
  date: '6/20',
  rhr: RHR_BASELINE,
  hrv: HRV_BASELINE,
  sleep: 8,
  sleepScore: 85,
  ...over,
});
const setRows = (rows) => {
  recRows.length = 0;
  recRows.push(...rows);
};
const renderView = (latest = { tsb: -5 }) =>
  render(<RecoveryView latest={latest} isWide={true} />);

beforeEach(() => {
  cleanup();
  setRows([day({ date: '6/18' }), day({ date: '6/19' }), day()]);
});

describe('RecoveryView', () => {
  it('shows the empty state when there is no recovery data', () => {
    setRows([]);
    renderView();
    expect(screen.getByText(/No recovery data yet/i)).toBeInTheDocument();
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
    renderView({ tsb: 0 });
    expect(screen.getByText('READY')).toBeInTheDocument();
  });

  it('reports CAUTION on moderately elevated RHR', () => {
    setRows([day({ rhr: RHR_BASELINE + 10 })]); // score ~60
    renderView({ tsb: 0 });
    expect(screen.getByText('CAUTION')).toBeInTheDocument();
  });

  it('reports REST when vitals are badly suppressed', () => {
    setRows([day({ rhr: RHR_BASELINE + 20 })]); // score ~20
    renderView({ tsb: 0 });
    expect(screen.getByText('REST')).toBeInTheDocument();
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
