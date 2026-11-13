import React, { useEffect, useRef } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import SettingsView from '../SettingsView.jsx';
import { supabase } from '../../supabaseClient.js';
import { THEME } from '../../constants/theme.js';
import { RADIUS, SPACE, TYPE } from '../../constants/tokens.js';

// Settings is a screen, not a destination: the four-tab IA (DESIGN_BRIEF §2.2)
// stays four, and this is reached from the gear on Today. It hosts the desktop
// SettingsView unchanged, so Strava behaves identically on both.
export default function MobileSettings({ onBack, notice }) {
  const { t } = useLingui();
  // Focus moves to the heading on arrival, so a screen reader announces the
  // new screen instead of leaving focus on a gear that no longer exists.
  const headingRef = useRef(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <div
      style={{
        padding: `${SPACE.lg}px ${SPACE.lg}px ${SPACE.xl}px`,
        background: THEME.bg,
        minHeight: '100vh',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACE.xs,
          margin: `-${SPACE.md}px 0 ${SPACE.md}px -${SPACE.md}px`,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label={t`Back to Today`}
          style={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: THEME.text,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h1
          ref={headingRef}
          tabIndex={-1}
          style={{
            outline: 'none',
            margin: 0,
            fontSize: TYPE.body.size,
            fontWeight: TYPE.label.weight,
            color: THEME.text,
          }}
        >
          <Trans>Settings</Trans>
        </h1>
      </header>
      <SettingsView notice={notice} />
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        style={{
          width: '100%',
          minHeight: 44,
          marginTop: SPACE.xl,
          border: `1px solid ${THEME.border}`,
          borderRadius: RADIUS.sm,
          background: THEME.surface,
          color: THEME.text,
          fontSize: TYPE.body.size,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        <Trans>Sign out</Trans>
      </button>
    </div>
  );
}
