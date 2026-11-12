import { useCallback, useEffect, useRef, useState } from 'react';
import { captureError } from '../../utils/sentry.js';
import {
  SHARE_BLOCKED,
  SHARE_COPIED,
  SHARE_COPIED_MS,
  SHARE_UNAVAILABLE,
} from '../constants/share.js';

const IDLE = {
  outcome: 'idle',
  message: '',
  link: null,
  fieldOpen: false,
  // Bumped each time the fallback field is (re)shown, to refocus it.
  shown: 0,
};

const report = (error, stage) =>
  captureError(error, { where: 'ShareLink', stage });

// Best effort when the link cannot be built: where the page is, minus any
// query string.
const here = () => {
  const { origin, pathname, hash } = window.location;
  return `${origin}${pathname}${hash}`;
};

/**
 * Copies `getLink()` to the clipboard, or, where that is missing or refused,
 * opens a read-only field holding the link, focused and selected. The caller
 * owns the field's and the button's refs.
 *
 * The write happens in the press's own task, before any await: Safari and
 * Firefox only allow it with the tap's transient activation (MDN, Clipboard
 * API, Security considerations).
 *
 * Sentry: an absent API (also what an insecure context looks like) and a
 * NotAllowedError are routine refusals and are not reported. Any other
 * failure is a defect and is. Every path shows a message and leaves the user
 * holding the link.
 */
export function useShareLink({ getLink, fieldRef, buttonRef }) {
  const [state, setState] = useState(IDLE);
  const seq = useRef(0);

  const copy = () => {
    const id = ++seq.current;
    // Settles state for this press only: a later press supersedes it.
    const settle = (next) => {
      if (seq.current === id) setState(next);
    };
    const fallback = (outcome, link) =>
      settle((s) => ({
        outcome,
        message: outcome === 'unavailable' ? SHARE_UNAVAILABLE : SHARE_BLOCKED,
        link,
        fieldOpen: true,
        shown: s.shown + 1,
      }));
    // Deferred, so the blank message below renders first and a repeated,
    // identical message is announced again.
    const later = (fn) => Promise.resolve().then(fn);

    let link;
    try {
      link = getLink();
    } catch (error) {
      report(error, 'build');
      later(() => fallback('failed', here()));
      return;
    }
    setState((s) => (s.message ? { ...s, message: '' } : s));

    const clipboard = window.navigator.clipboard;
    if (typeof clipboard?.writeText !== 'function') {
      later(() => fallback('unavailable', link));
      return;
    }
    let write;
    try {
      write = clipboard.writeText(link);
    } catch (error) {
      report(error, 'write');
      later(() => fallback('failed', link));
      return;
    }
    Promise.resolve(write).then(
      () =>
        settle((s) => ({
          ...s,
          outcome: 'copied',
          message: SHARE_COPIED,
          link,
          fieldOpen: false,
        })),
      (error) => {
        const refused = error?.name === 'NotAllowedError';
        if (!refused) report(error, 'write');
        fallback(refused ? 'blocked' : 'failed', link);
      }
    );
  };

  const closeField = useCallback(() => {
    // Before the field goes, so focus is never dropped to the page.
    buttonRef.current?.focus();
    setState((s) => ({ ...s, outcome: 'idle', message: '', fieldOpen: false }));
  }, [buttonRef]);

  useEffect(() => {
    if (state.outcome !== 'copied' || !state.message) return undefined;
    const id = setTimeout(
      () =>
        setState((s) => (s.outcome === 'copied' ? { ...s, message: '' } : s)),
      SHARE_COPIED_MS
    );
    return () => clearTimeout(id);
  }, [state.outcome, state.message]);

  // focus() first: select() alone does not focus, and the highlight only
  // shows on a focused field (MDN, HTMLInputElement.setSelectionRange).
  useEffect(() => {
    const field = fieldRef.current;
    if (!state.shown || !field) return;
    field.focus();
    field.setSelectionRange(0, field.value.length);
  }, [state.shown, fieldRef]);

  return { ...state, copy, closeField };
}
