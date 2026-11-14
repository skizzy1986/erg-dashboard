import { i18n } from '@lingui/core';
import { messages as en } from '../../locales/en.po';
import { messages as es } from '../../locales/es.po';
import { authErrorText } from '../authError.js';

describe('authErrorText', () => {
  it('returns nothing without an error', () => {
    expect(authErrorText(null, 'es')).toBeNull();
    expect(authErrorText(undefined, 'en')).toBeNull();
  });

  it("shows Supabase's own message in English, byte for byte", () => {
    const error = {
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
    };
    expect(authErrorText(error, 'en')).toBe('Invalid login credentials');
  });

  describe('in Spanish', () => {
    beforeEach(() => {
      i18n.load('es', { ...en, ...es });
      i18n.activate('es');
    });

    it.each([
      ['invalid_credentials', 'Correo o contraseña incorrectos.'],
      [
        'email_not_confirmed',
        'Confirma tu correo electrónico antes de iniciar sesión.',
      ],
      [
        'over_request_rate_limit',
        'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
      ],
      ['user_banned', 'Esta cuenta no puede iniciar sesión.'],
      [
        'request_timeout',
        'El servidor tardó demasiado en responder. Inténtalo de nuevo.',
      ],
    ])('maps %s', (code, text) => {
      expect(authErrorText({ code, message: 'x' }, 'es')).toBe(text);
    });

    it('names a network failure, which has no code', () => {
      expect(
        authErrorText(
          { name: 'AuthRetryableFetchError', message: 'Failed to fetch' },
          'es'
        )
      ).toMatch(/Revisa tu conexión/);
    });

    it('falls back to a generic line for an unknown code', () => {
      expect(authErrorText({ code: 'brand_new', message: 'x' }, 'es')).toBe(
        'No pudimos iniciar sesión. Inténtalo de nuevo.'
      );
    });
  });
});
