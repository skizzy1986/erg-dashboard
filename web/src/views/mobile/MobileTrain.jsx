import React from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import ErgLiveView from '../ErgLiveView.jsx';
import StrengthLogger from '../../StrengthLogger.jsx';
import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { RADIUS, SPACE, TYPE } from '../../constants/tokens.js';

// Train is the doing: the session in front of you. It absorbs what were the
// separate "Live" and "Strength" tabs — DESIGN_BRIEF.md §2.2.
//
// When the planner (R40) writes today's session as a sessions row with
// status 'planned', it leads this screen. Until then these are the two entry
// points, so nothing reachable before this change is unreachable after it.
const ENTRIES = [
  {
    mode: 'erg',
    label: 'Erg session',
    detail: 'Connect the PM5 and row against a watt band',
    token: 'accent',
  },
  {
    mode: 'strength',
    label: 'Strength session',
    detail: 'Log sets against today’s template',
    token: 'accentAlt',
  },
];

// What each entry says on screen; ENTRIES keeps its English for code and tests.
export const ENTRY_MESSAGES = {
  erg: {
    label: msg({ message: 'Erg session', comment: 'Start a rowing session' }),
    detail: msg`Connect the PM5 and row against a watt band`,
  },
  strength: {
    label: msg({
      message: 'Strength session',
      comment: 'Start a strength session',
    }),
    detail: msg`Log sets against today’s template`,
  },
};

export { ENTRIES };

export default function MobileTrain({ mode, onMode }) {
  const { i18n } = useLingui();
  // A live session owns the screen — no tab bar, no chrome (HANDOFF.md §4).
  if (mode === 'erg') return <ErgLiveView />;
  if (mode === 'strength') return <StrengthLogger />;

  return (
    <div
      style={{
        padding: `${SPACE.lg}px ${SPACE.lg}px ${SPACE.xl}px`,
        background: THEME.bg,
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          fontSize: TYPE.micro.size,
          fontWeight: TYPE.micro.weight,
          letterSpacing: TYPE.micro.letterSpacing,
          color: THEME.textSubtle,
          marginBottom: SPACE.md,
        }}
      >
        <Trans comment="Heading, all capitals">START A SESSION</Trans>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
        {ENTRIES.map((e) => (
          <button
            key={e.mode}
            onClick={() => onMode(e.mode)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              background: THEME.surface,
              border: `1px solid ${THEME.border}`,
              borderLeft: `3px solid ${THEME[e.token]}`,
              borderRadius: RADIUS.md,
              padding: `${SPACE.lg}px`,
              cursor: 'pointer',
              fontFamily: FONT.sans,
            }}
          >
            <div
              style={{
                fontSize: TYPE.title.size,
                fontWeight: TYPE.title.weight,
                letterSpacing: TYPE.title.letterSpacing,
                color: THEME.text,
              }}
            >
              {i18n._(ENTRY_MESSAGES[e.mode].label)}
            </div>
            <div
              style={{
                fontSize: TYPE.bodySm.size,
                fontWeight: TYPE.bodySm.weight,
                color: THEME.muted,
                marginTop: SPACE.xs,
              }}
            >
              {i18n._(ENTRY_MESSAGES[e.mode].detail)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
