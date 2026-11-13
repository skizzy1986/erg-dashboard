import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import React from 'react';
import {
  RHR_DEFAULT as RHR_BASELINE,
  HRV_DEFAULT as HRV_BASELINE,
  computeReadiness,
  computePersonalBaselines,
} from '../../utils/recoveryAnalytics.js';

// Vitals now come from useVitals, not the static recoveryLog constant.
// LIPID_REF stays real.
const useVitalsMock = vi.fn();
vi.mock('../../hooks/useVitals.js', () => ({
  useVitals: () => useVitalsMock(),
}));

// The three health-record hooks are mocked per test; each defaults to an
// empty, settled read.
const useBpReadingsMock = vi.fn();
const useLabResultsMock = vi.fn();
const useInjuriesMock = vi.fn();
vi.mock('../../hooks/useBpReadings.js', () => ({
  useBpReadings: () => useBpReadingsMock(),
}));
vi.mock('../../hooks/useLabResults.js', () => ({
  useLabResults: () => useLabResultsMock(),
}));
vi.mock('../../hooks/useInjuries.js', () => ({
  useInjuries: () => useInjuriesMock(),
}));

const settled = (rows = []) => ({
  rows,
  data: rows,
  isPending: false,
  isError: false,
  isPaused: false,
});

import { LIPID_REF } from '../../constants/logs.js';
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
const HEADINGS = [
  'BLOOD PRESSURE',
  'BLOODS · LIPID PANEL',
  'HORMONE PANEL',
  'INJURY WATCH',
];

const renderView = () => render(<RecoveryView isWide={true} />);

beforeEach(() => {
  cleanup();
  useVitalsMock.mockReset();
  useBpReadingsMock.mockReturnValue(settled());
  useLabResultsMock.mockReturnValue(settled());
  useInjuriesMock.mockReturnValue(settled());
  setRows([day(), day({ date: '2026-06-19' }), day({ date: '2026-06-18' })]);
});

describe('RecoveryView', () => {
  it('says vitals are unavailable when the read returns nothing', () => {
    setRows([]);
    renderView();
    expect(screen.getByText('VITALS UNAVAILABLE')).toBeInTheDocument();
  });

  it('still renders all four health cards when there are no vitals', () => {
    setRows([]);
    renderView();
    for (const heading of HEADINGS) {
      expect(screen.getByRole('region', { name: heading })).toBeInTheDocument();
    }
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
    expect(screen.getByText(/INJURY WATCH/)).toBeInTheDocument();
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

  it.each([
    ['BLOOD PRESSURE', 'No blood pressure readings yet.'],
    ['BLOODS · LIPID PANEL', 'No lipid results yet.'],
    ['HORMONE PANEL', 'No hormone results yet.'],
    ['INJURY WATCH', 'No injuries logged yet.'],
  ])('renders the %s heading over its own empty panel', (heading, label) => {
    renderView();
    const card = screen.getByText(heading).parentElement;
    expect(within(card).getByText(label)).toBeInTheDocument();
    expect(screen.getAllByText(label)).toHaveLength(1);
  });

  it('renders each lipid decision limit from LIPID_REF', () => {
    renderView();
    for (const m of LIPID_REF) {
      expect(screen.getByText(m.marker)).toBeInTheDocument();
    }
  });

  it('links the lipid decision limits to their published source', () => {
    renderView();
    const link = screen.getByRole('link', { name: LIPID_REF[0].source.name });
    expect(link).toHaveAttribute('href', LIPID_REF[0].source.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toMatch(/noopener/);
  });

  it('shows no pending placeholders for health records', () => {
    renderView();
    expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
  });

  it('exercises the positive-TSB narrative branch', () => {
    renderView({ tsb: 7 });
    expect(screen.getByText(/READINESS ·/)).toBeInTheDocument();
    expect(screen.getByText(/training load \(TSB/)).toBeInTheDocument();
  });
});

const BP_ROW = {
  id: 'bp1',
  measured_at: '2026-08-20T16:30:00Z',
  sys_mmhg: 118,
  dia_mmhg: 76,
  pulse_bpm: 54,
  context: 'seated, rested',
  clean: true,
};
const LAB_ROWS = [
  {
    id: 'l1',
    collected_on: '2026-08-01',
    panel: 'lipid',
    marker: 'LDL-C',
    value: 2.4,
    value_qualifier: null,
    unit: 'mmol/L',
    ref_low: null,
    ref_high: null,
    ref_source: null,
    note: null,
  },
  {
    id: 'l2',
    collected_on: '2026-08-01',
    panel: 'hormone',
    marker: 'Oestradiol',
    value: 40,
    value_qualifier: '<',
    unit: 'pmol/L',
    ref_low: null,
    ref_high: null,
    ref_source: null,
    note: null,
  },
  {
    id: 'l3',
    collected_on: '2026-08-01',
    panel: 'hormone',
    marker: 'Testosterone',
    value: 18.2,
    value_qualifier: null,
    unit: 'nmol/L',
    ref_low: 8.6,
    ref_high: 29,
    ref_source: 'Lab-printed range',
    note: null,
  },
  {
    id: 'l0',
    collected_on: '2026-02-01',
    panel: 'hormone',
    marker: 'Testosterone',
    value: 12.1,
    value_qualifier: null,
    unit: 'nmol/L',
    ref_low: null,
    ref_high: null,
    ref_source: null,
    note: null,
  },
];
const INJURY_ROWS = [
  {
    id: 'i2',
    region: 'Shoulder',
    side: null,
    onset_on: '2026-06-01',
    resolved_on: '2026-07-01',
    status: 'resolved',
    note: null,
  },
  {
    id: 'i1',
    region: 'Hamstring',
    side: 'left',
    onset_on: '2026-05-01',
    resolved_on: null,
    status: 'monitoring',
    note: 'rehab block',
  },
];

// Each heading maps to the hook that feeds it and the rows that prove data.
const CARDS = [
  ['BLOOD PRESSURE', useBpReadingsMock, [BP_ROW], '118/76 mmHg · 54 bpm'],
  ['BLOODS · LIPID PANEL', useLabResultsMock, LAB_ROWS, '2.4 mmol/L'],
  ['HORMONE PANEL', useLabResultsMock, LAB_ROWS, '18.2 nmol/L'],
  ['INJURY WATCH', useInjuriesMock, INJURY_ROWS, 'MONITORING'],
];

describe('RecoveryView health-record cards', () => {
  afterEach(() => {
    delete globalThis.process.env.TZ;
  });

  const card = (heading) => screen.getByRole('region', { name: heading });

  it.each(CARDS)('%s shows Loading… while pending', (heading, hook) => {
    hook.mockReturnValue({ ...settled(), data: undefined, isPending: true });
    renderView();
    expect(within(card(heading)).getByText('Loading…')).toBeInTheDocument();
  });

  it.each(CARDS)('%s raises an alert on a failed read', (heading, hook) => {
    hook.mockReturnValue({ ...settled(), data: undefined, isError: true });
    renderView();
    expect(within(card(heading)).getByRole('alert')).toHaveTextContent(
      /Couldn't load/
    );
  });

  it.each(CARDS)('%s says offline on a paused first fetch', (heading, hook) => {
    hook.mockReturnValue({
      ...settled(),
      data: undefined,
      isPending: true,
      isPaused: true,
    });
    renderView();
    expect(
      within(card(heading)).getByText(/Offline: no saved data yet/)
    ).toBeInTheDocument();
  });

  it.each(CARDS)(
    '%s renders its rows when data arrives',
    (heading, hook, rows, text) => {
      hook.mockReturnValue(settled(rows));
      renderView();
      expect(within(card(heading)).getByText(text)).toBeInTheDocument();
    }
  );

  it.each(CARDS)(
    '%s keeps earlier rows when a refetch fails',
    (heading, hook, rows, text) => {
      hook.mockReturnValue({ ...settled(rows), isError: true });
      renderView();
      expect(within(card(heading)).getByText(text)).toBeInTheDocument();
      expect(
        within(card(heading)).getByText(/showing earlier data/)
      ).toBeInTheDocument();
    }
  );

  it('renders a BP reading in local time across midnight (Perth)', () => {
    globalThis.process.env.TZ = 'Australia/Perth';
    useBpReadingsMock.mockReturnValue(settled([BP_ROW]));
    renderView();
    const bp = card('BLOOD PRESSURE');
    expect(within(bp).getByText('8/21/26 00:30')).toBeInTheDocument();
    expect(within(bp).queryByText(/8\/20\/26|2026-08-20/)).toBeNull();
    expect(within(bp).getByText('seated, rested · clean')).toBeInTheDocument();
  });

  it('shows BP raw values with no category label', () => {
    useBpReadingsMock.mockReturnValue(settled([BP_ROW]));
    renderView();
    const bp = card('BLOOD PRESSURE');
    expect(
      within(bp).queryByText(/normal|high|optimal|hypertension/i)
    ).toBeNull();
  });

  it('shows the latest hormone draw only, with a sourced range and qualifier', () => {
    useLabResultsMock.mockReturnValue(settled(LAB_ROWS));
    renderView();
    const h = card('HORMONE PANEL');
    expect(within(h).getByText('Collected 8/1/26')).toBeInTheDocument();
    expect(within(h).getByText('<40 pmol/L')).toBeInTheDocument();
    expect(
      within(h).getByText('ref 8.6–29 (Lab-printed range)')
    ).toBeInTheDocument();
    expect(within(h).queryByText('12.1 nmol/L')).toBeNull();
  });

  it('keeps the lipid decision limits under a populated lipid card', () => {
    useLabResultsMock.mockReturnValue(settled(LAB_ROWS));
    renderView();
    const lipid = card('BLOODS · LIPID PANEL');
    expect(within(lipid).getByText('2.4 mmol/L')).toBeInTheDocument();
    expect(within(lipid).getByText(LIPID_REF[0].marker)).toBeInTheDocument();
  });

  it('lists active and monitoring injuries before resolved ones', () => {
    useInjuriesMock.mockReturnValue(settled(INJURY_ROWS));
    renderView();
    const inj = card('INJURY WATCH');
    const text = inj.textContent;
    expect(text.indexOf('Hamstring (left)')).toBeLessThan(
      text.indexOf('Shoulder')
    );
    expect(
      within(inj).getByText('since 5/1/26 · rehab block')
    ).toBeInTheDocument();
    expect(
      within(inj).getByText('since 6/1/26 · resolved 7/1/26')
    ).toBeInTheDocument();
  });
});
