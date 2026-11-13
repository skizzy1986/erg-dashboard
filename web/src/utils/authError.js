import { i18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';

// Supabase's AuthError carries a stable `code` (auth-js lib/error-codes.ts);
// its `message` is English prose from the server. English keeps showing that
// prose exactly as before. Other languages get a message chosen by code, so
// none of these English source strings is ever on screen — they exist to be
// translated.
const BY_CODE = {
  invalid_credentials: msg({
    message: 'Wrong email or password.',
    comment:
      'Login error. Only shown in Spanish; English shows the server message.',
  }),
  email_not_confirmed: msg({
    message: 'Confirm your email address before signing in.',
    comment:
      'Login error. Only shown in Spanish; English shows the server message.',
  }),
  over_request_rate_limit: msg({
    message: 'Too many attempts. Wait a few minutes and try again.',
    comment:
      'Login error. Only shown in Spanish; English shows the server message.',
  }),
  user_banned: msg({
    message: 'This account cannot sign in.',
    comment:
      'Login error. Only shown in Spanish; English shows the server message.',
  }),
  request_timeout: msg({
    message: 'The server took too long to answer. Try again.',
    comment:
      'Login error. Only shown in Spanish; English shows the server message.',
  }),
};

const NETWORK = msg({
  message: 'Could not reach the server. Check your connection and try again.',
  comment: 'Login error when the device is offline. Only shown in Spanish.',
});

const GENERIC = msg({
  message: 'We could not sign you in. Try again.',
  comment: 'Login error for any unrecognised cause. Only shown in Spanish.',
});

export function authErrorText(error, lang) {
  if (!error) return null;
  if (lang === 'en') return error.message;
  const known = BY_CODE[error.code];
  if (known) return i18n._(known);
  // A fetch that never reached the server has no code (AuthRetryableFetchError).
  if (error.name === 'AuthRetryableFetchError') return i18n._(NETWORK);
  return i18n._(GENERIC);
}
