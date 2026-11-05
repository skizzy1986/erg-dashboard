import { describe, it, expect } from 'vitest';
import * as trainingConfig from '../trainingConfig.js';
import {
  CALIBRATION_STATUS,
  CRITICAL_POWER,
  FTP_TEST,
  deriveCalibrationStatus,
  derivePaceZones,
  deriveHrBands,
  HR_ZONES,
} from '../trainingConfig.js';

const loadModelRow = (rows) => rows.find((r) => r.key === 'load-model');

describe('CP is never mirrored as a static constant', () => {
  it('CRITICAL_POWER carries no cpEstimate', () => {
    expect(CRITICAL_POWER).not.toHaveProperty('cpEstimate');
  });

  it('exports no static PACE_ZONES that could diverge from the live bands', () => {
    expect(trainingConfig).not.toHaveProperty('PACE_ZONES');
  });

  it('no static calibration row quotes a hardcoded CP wattage', () => {
    const copy = CALIBRATION_STATUS.map(
      (r) => `${r.metric} ${r.basis} ${r.upgrade}`
    ).join(' ');
    expect(copy).not.toMatch(/\bCP\b[^,.]*\d+\s*W\b/i);
    expect(copy).not.toMatch(/CP\/FTP est\./i);
  });

  it('the CP test card carries no past-dated "when"', () => {
    expect(FTP_TEST.when).not.toMatch(/Jun|Jul/);
  });
});

describe('deriveCalibrationStatus', () => {
  it('quotes the live CP and its status when the anchor is available', () => {
    const rows = deriveCalibrationStatus({
      cp: 200,
      cpAvailable: true,
      cpStatus: 'provisional',
    });
    expect(loadModelRow(rows).basis).toBe(
      'CP 200W (provisional), strength TSS ±30%, CTL needs 42d'
    );
  });

  it('reflects a confirmed anchor without changing the wattage source', () => {
    const rows = deriveCalibrationStatus({
      cp: 210,
      cpAvailable: true,
      cpStatus: 'confirmed',
    });
    expect(loadModelRow(rows).basis).toMatch(/^CP 210W \(confirmed\),/);
  });

  it('says the anchor is unavailable rather than falling back to a stale CP', () => {
    const rows = deriveCalibrationStatus({ cp: null, cpAvailable: false });
    expect(loadModelRow(rows).basis).toMatch(/^CP anchor unavailable,/);
    expect(loadModelRow(rows).basis).not.toMatch(/\d+W/);
  });

  it('treats a missing context the same as an unavailable anchor', () => {
    expect(loadModelRow(deriveCalibrationStatus()).basis).toMatch(
      /^CP anchor unavailable,/
    );
  });

  it('labels an available anchor with an unknown status explicitly', () => {
    const rows = deriveCalibrationStatus({ cp: 200, cpAvailable: true });
    expect(loadModelRow(rows).basis).toBe(
      'CP 200W (status unknown), strength TSS ±30%, CTL needs 42d'
    );
  });

  it('leaves every other row untouched', () => {
    const rows = deriveCalibrationStatus({
      cp: 200,
      cpAvailable: true,
      cpStatus: 'provisional',
    });
    expect(rows).toHaveLength(CALIBRATION_STATUS.length);
    for (const [i, row] of rows.entries()) {
      if (row.key === 'load-model') continue;
      expect(row).toBe(CALIBRATION_STATUS[i]);
    }
  });

  it('does not mutate the source array', () => {
    const before = loadModelRow(CALIBRATION_STATUS).basis;
    deriveCalibrationStatus({ cp: 200, cpAvailable: true });
    expect(loadModelRow(CALIBRATION_STATUS).basis).toBe(before);
  });

  it('does not upgrade the confidence tier — that is #181, not this', () => {
    const rows = deriveCalibrationStatus({
      cp: 200,
      cpAvailable: true,
      cpStatus: 'confirmed',
    });
    expect(loadModelRow(rows).tier).toBe(2);
    expect(loadModelRow(rows).conf).toBe('Estimated');
  });
});

describe('derivePaceZones', () => {
  it('scales the bands with the CP it is given', () => {
    // Example CPs only — the live value is the rowing_cp anchor.
    const at180 = derivePaceZones(180).find((z) => z.zone === 'AT');
    const at200 = derivePaceZones(200).find((z) => z.zone === 'AT');
    expect(at200.wattsLow).toBeGreaterThan(at180.wattsLow);
    expect(at200.wattsHigh).toBeGreaterThan(at180.wattsHigh);
  });

  it('puts UT2/UT1/AT at the published fractions of an example CP', () => {
    const zones = derivePaceZones(200); // example CP
    const band = (z) => {
      const found = zones.find((x) => x.zone === z);
      return [found.wattsLow, found.wattsHigh];
    };
    expect(band('UT2')).toEqual([110, 140]);
    expect(band('UT1')).toEqual([140, 160]);
    expect(band('AT')).toEqual([160, 180]);
  });
});

describe('HR zones are fractions of the live working MHR', () => {
  it('exports no static working-MHR constant', () => {
    expect(trainingConfig).not.toHaveProperty('EST_MHR');
  });

  it('carries no bpm on the static zone rows', () => {
    for (const z of HR_ZONES) {
      expect(z).not.toHaveProperty('bpm');
      expect(z.pctHigh).toBeGreaterThan(z.pctLow);
    }
  });

  it('deriveHrBands(180) scales the fractions (example MHR)', () => {
    expect(deriveHrBands(180)).toEqual([
      { zone: 'UT2', bpmLow: 0, bpmHigh: 126 },
      { zone: 'UT1', bpmLow: 126, bpmHigh: 144 },
      { zone: 'AT', bpmLow: 144, bpmHigh: 157 },
      { zone: 'TR', bpmLow: 157, bpmHigh: 166 },
      { zone: 'AN', bpmLow: 166, bpmHigh: 180 },
    ]);
  });

  it('deriveHrBands returns null without a usable MHR', () => {
    expect(deriveHrBands(null)).toBe(null);
    expect(deriveHrBands(undefined)).toBe(null);
    expect(deriveHrBands(0)).toBe(null);
    expect(deriveHrBands('n/a')).toBe(null);
  });

  it('no calibration row or test prereq quotes a baseline, kcal or drag-factor figure', () => {
    const copy = [
      ...CALIBRATION_STATUS.map((r) => `${r.metric} ${r.basis} ${r.upgrade}`),
      FTP_TEST.prereq,
    ].join(' ');
    expect(copy).not.toMatch(/\(\d{2,}\)/);
    expect(copy).not.toMatch(/~\d,\d{3}/);
    expect(copy).not.toMatch(/\bDF\d+/);
  });
});
