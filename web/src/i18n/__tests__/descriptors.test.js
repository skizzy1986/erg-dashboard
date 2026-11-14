import { i18n } from '@lingui/core';
import { DESTINATIONS } from '../../constants/destinations.js';
import { TSB_BANDS, TSB_BAND_MESSAGES } from '../../utils/trainingLoad.js';
import { SRPE_GUIDE } from '../../constants/trainingConfig.js';
import { SRPE_GUIDE_MESSAGES } from '../../constants/srpeGuideMessages.js';
import {
  READINESS_STATUS_MESSAGES,
  computeReadiness,
} from '../../utils/recoveryAnalytics.js';
import {
  LAB_MARKER_MESSAGES,
  LAB_REF_MESSAGE,
  labMarkerText,
} from '../../utils/healthRecords.js';
import { LIPID_REF } from '../../constants/logs.js';
import { ENTRIES, ENTRY_MESSAGES } from '../../views/mobile/MobileTrain.jsx';
import { PANES, PANE_MESSAGES } from '../../views/mobile/MobileProgress.jsx';
import {
  ERROR_CODE_LABELS,
  ERROR_CODE_MESSAGES,
} from '../../utils/stravaStatus.js';
import {
  CALLBACK_REASON_LABELS,
  CALLBACK_REASON_MESSAGES,
} from '../../utils/stravaCallback.js';
import {
  DISCONNECT_CONFIRM,
  DISCONNECT_CONFIRM_MSG,
} from '../../hooks/useStravaConnect.js';

vi.mock('../../supabaseClient.js', () => ({ supabase: {} }));
vi.mock('../../views/ErgLiveView.jsx', () => ({ default: () => null }));
vi.mock('../../StrengthLogger.jsx', () => ({ default: () => null }));
vi.mock('../../views/mobile/MobileStrength.jsx', () => ({
  default: () => null,
}));

// Where an exported English constant is read by tests or e2e, it stays a
// string and the UI renders a co-located descriptor instead. Tests run in dev
// mode, where descriptors keep their `message`, so the two can be pinned
// together here and cannot drift.
describe('English constants and their descriptors agree', () => {
  it('destinations', () => {
    for (const d of DESTINATIONS) {
      expect(d.message.message, d.id).toBe(d.label);
      expect(i18n._(d.message), d.id).toBe(d.label);
    }
  });

  it('Strava error codes', () => {
    expect(Object.keys(ERROR_CODE_MESSAGES).sort()).toEqual(
      Object.keys(ERROR_CODE_LABELS).sort()
    );
    for (const [code, label] of Object.entries(ERROR_CODE_LABELS)) {
      expect(i18n._(ERROR_CODE_MESSAGES[code]), code).toBe(label);
    }
  });

  it('Strava callback reasons', () => {
    expect(Object.keys(CALLBACK_REASON_MESSAGES).sort()).toEqual(
      Object.keys(CALLBACK_REASON_LABELS).sort()
    );
    for (const [reason, label] of Object.entries(CALLBACK_REASON_LABELS)) {
      expect(i18n._(CALLBACK_REASON_MESSAGES[reason]), reason).toBe(label);
    }
  });

  it('the disconnect confirmation', () => {
    expect(i18n._(DISCONNECT_CONFIRM_MSG)).toBe(DISCONNECT_CONFIRM);
  });

  it('TSB bands (i18n Phase 2a)', () => {
    expect(Object.keys(TSB_BAND_MESSAGES).sort()).toEqual(
      TSB_BANDS.map((b) => b.key).sort()
    );
    for (const band of TSB_BANDS) {
      expect(i18n._(TSB_BAND_MESSAGES[band.key]), band.key).toBe(band.label);
    }
  });

  it('the sRPE guide, row for row, and its shape untouched', () => {
    expect(Object.keys(SRPE_GUIDE_MESSAGES)).toEqual(
      SRPE_GUIDE.map((s) => s.range)
    );
    for (const row of SRPE_GUIDE) {
      expect(Object.keys(row).sort()).toEqual(
        ['anchor', 'color', 'label', 'range', 'zone'].sort()
      );
      const m = SRPE_GUIDE_MESSAGES[row.range];
      expect(i18n._(m.label), row.range).toBe(row.label);
      expect(i18n._(m.anchor), row.range).toBe(row.anchor);
      // Only word zones carry a descriptor; codes (UT2, AT/TR) are as-is.
      expect(m.zone ? i18n._(m.zone) : row.zone, row.range).toBe(row.zone);
    }
  });

  it('readiness status codes', () => {
    const codes = new Set([
      computeReadiness(null).status,
      computeReadiness({ rhr: 50 }).status,
      computeReadiness({ rhr: 64 }).status,
      computeReadiness({ rhr: 70 }).status,
    ]);
    expect([...codes].sort()).toEqual(
      Object.keys(READINESS_STATUS_MESSAGES).sort()
    );
    for (const code of codes) {
      expect(i18n._(READINESS_STATUS_MESSAGES[code])).toBe(code);
    }
  });

  it('lipid marker names, one per LIPID_REF row, the constants untouched', () => {
    expect(Object.keys(LAB_MARKER_MESSAGES)).toEqual(
      LIPID_REF.map((r) => r.marker)
    );
    for (const { marker } of LIPID_REF) {
      expect(LAB_MARKER_MESSAGES[marker].message, marker).toBe(marker);
      expect(labMarkerText(i18n, marker), marker).toBe(marker);
    }
    expect(labMarkerText(i18n, 'ApoB')).toBe('ApoB');
    expect(labMarkerText(i18n, 'constructor')).toBe('constructor');
  });

  it('the lab range word', () => {
    expect(i18n._(LAB_REF_MESSAGE)).toBe('ref');
  });

  it('mobile Train entries and Progress panes', () => {
    for (const e of ENTRIES) {
      expect(i18n._(ENTRY_MESSAGES[e.mode].label), e.mode).toBe(e.label);
      expect(i18n._(ENTRY_MESSAGES[e.mode].detail), e.mode).toBe(e.detail);
    }
    for (const p of PANES) {
      expect(i18n._(PANE_MESSAGES[p.id]), p.id).toBe(p.label);
    }
  });
});
