import { describe, it, expect } from 'vitest';
import * as trainingConfig from '../trainingConfig.js';
import {
  CALIBRATION_STATUS,
  CRITICAL_POWER,
  FTP_TEST,
  deriveCalibrationStatus,
  derivePaceZones,
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
    expect(copy).not.toMatch(/\b190\s*W\b/i);
    expect(copy).not.toMatch(/CP\/FTP est\./i);
  });

  it('the CP test card carries no past-dated "when"', () => {
    expect(FTP_TEST.when).not.toMatch(/Jun|Jul/);
  });
});

describe('deriveCalibrationStatus', () => {
  it('quotes the live CP and its status when the anchor is available', () => {
    const rows = deriveCalibrationStatus({
      cp: 205,
      cpAvailable: true,
      cpStatus: 'provisional',
    });
    expect(loadModelRow(rows).basis).toBe(
      'CP 205W (provisional), strength TSS ±30%, CTL needs 42d'
    );
  });

  it('reflects a confirmed anchor without changing the wattage source', () => {
    const rows = deriveCalibrationStatus({
      cp: 212,
      cpAvailable: true,
      cpStatus: 'confirmed',
    });
    expect(loadModelRow(rows).basis).toMatch(/^CP 212W \(confirmed\),/);
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
    const rows = deriveCalibrationStatus({ cp: 205, cpAvailable: true });
    expect(loadModelRow(rows).basis).toBe(
      'CP 205W (status unknown), strength TSS ±30%, CTL needs 42d'
    );
  });

  it('leaves every other row untouched', () => {
    const rows = deriveCalibrationStatus({
      cp: 205,
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
    deriveCalibrationStatus({ cp: 205, cpAvailable: true });
    expect(loadModelRow(CALIBRATION_STATUS).basis).toBe(before);
  });

  it('does not upgrade the confidence tier — that is #181, not this', () => {
    const rows = deriveCalibrationStatus({
      cp: 205,
      cpAvailable: true,
      cpStatus: 'confirmed',
    });
    expect(loadModelRow(rows).tier).toBe(2);
    expect(loadModelRow(rows).conf).toBe('Estimated');
  });
});

describe('derivePaceZones', () => {
  it('scales the bands with the CP it is given', () => {
    const at190 = derivePaceZones(190).find((z) => z.zone === 'AT');
    const at205 = derivePaceZones(205).find((z) => z.zone === 'AT');
    expect(at205.wattsLow).toBeGreaterThan(at190.wattsLow);
    expect(at205.wattsHigh).toBeGreaterThan(at190.wattsHigh);
  });

  it('puts UT2/UT1/AT where the live 205W anchor implies', () => {
    const zones = derivePaceZones(205);
    const band = (z) => {
      const found = zones.find((x) => x.zone === z);
      return [found.wattsLow, found.wattsHigh];
    };
    expect(band('UT2')).toEqual([113, 144]);
    expect(band('UT1')).toEqual([144, 164]);
    expect(band('AT')).toEqual([164, 185]);
  });
});
