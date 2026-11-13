import { i18n } from '@lingui/core';
import { DESTINATIONS } from '../../constants/destinations.js';
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
});
