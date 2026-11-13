import { i18n } from '@lingui/core';
import { messages as en } from '../../locales/en.po';
import { messages as es } from '../../locales/es.po';
import { describeConnection } from '../stravaStatus.js';
import { stravaCallbackMessage } from '../stravaCallback.js';

const NOW = new Date('2026-11-13T12:00:00');
const base = {
  connected: true,
  last_run_status: 'ok',
  last_run_at: '2026-11-13T11:59:30',
  imported_total: 1,
  adopted_total: 0,
  backfill_complete: true,
};

describe('Strava status wording', () => {
  it('never groups a count by locale, in English or Spanish', () => {
    const c = { ...base, imported_total: 1234 };
    expect(describeConnection(c, NOW).detail).toMatch(
      /^1234 sessions imported/
    );
    i18n.load('es', { ...en, ...es });
    i18n.activate('es');
    expect(describeConnection(c, NOW).detail).toMatch(
      /^1234 sesiones importadas/
    );
  });

  describe('in Spanish', () => {
    beforeEach(() => {
      i18n.load('es', { ...en, ...es });
      i18n.activate('es');
    });

    it('inflects the singular', () => {
      const s = describeConnection(base, NOW);
      expect(s.headline).toBe('Última sincronización justo ahora');
      expect(s.detail).toBe(
        '1 sesión importada desde que conectaste. Las actividades nuevas de Strava se importan automáticamente.'
      );
    });

    it('says how long ago, in hours and days', () => {
      expect(
        describeConnection({ ...base, last_run_at: '2026-11-13T11:00:00' }, NOW)
          .headline
      ).toBe('Última sincronización hace 1 hora');
      expect(
        describeConnection({ ...base, last_run_at: '2026-11-12T00:00:00' }, NOW)
          .headline
      ).toBe('Última sincronización hace 1 día');
    });

    it('agrees the verb with the count of skipped activities', () => {
      const one = describeConnection(
        { ...base, ambiguous_activity_ids: [1] },
        NOW
      );
      const two = describeConnection(
        { ...base, ambiguous_activity_ids: [1, 2] },
        NOW
      );
      expect(one.headline).toBe(
        '1 actividad coincidió con más de una sesión existente y se omitió'
      );
      expect(two.headline).toBe(
        '2 actividades coincidieron con más de una sesión existente y se omitieron'
      );
    });

    it('keeps the HH:MM clock untouched', () => {
      const s = describeConnection(
        {
          ...base,
          last_run_status: 'rate_limited',
          rate_limit_resets_at: '2026-11-13T13:05:00',
        },
        NOW
      );
      expect(s.headline).toBe(
        'Se alcanzó el límite de uso de Strava. La sincronización se reanuda a las 13:05.'
      );
    });

    it('translates the OAuth callback notice', () => {
      expect(
        stravaCallbackMessage({ status: 'error', reason: 'state' }).text
      ).toBe(
        'No se pudo conectar Strava. El enlace de conexión había caducado o ya se había usado. Vuelve a iniciar la conexión.'
      );
    });
  });
});
