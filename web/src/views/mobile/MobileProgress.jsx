import React, { useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import MobileAnalytics from './MobileAnalytics.jsx';
import MobileSessionLog from './MobileSessionLog.jsx';
import MobileStrength from './MobileStrength.jsx';
import StravaConnectPanel from '../../components/StravaConnectPanel.jsx';
import { THEME } from '../../constants/theme.js';
import { alpha } from '../../utils/themeCss.js';
import { FONT } from '../../constants/type.js';
import { RADIUS, SPACE, TYPE } from '../../constants/tokens.js';

// Progress is the reviewing: is the training working. It absorbs what were the
// separate "Log" and "Strength" tabs — DESIGN_BRIEF.md §2.2.
//
// progress.html draws four sub-tabs (Load · Erg · Strength · History) on one
// SegmentedNav. Three of them have content today. Erg is the power-at-HR
// barometer and is later work, so the strip is built from the panes that exist
// rather than showing a dead tab.
//
// Load is MobileAnalytics, which was the whole Analytics tab before this
// change: the TSB hero, CTL/ATL, the load trend and the weekly TSS history.
// That is Progress's question — is the training working — not Today's.
const PANES = [
  { id: 'load', label: 'Load', render: () => <MobileAnalytics /> },
  { id: 'history', label: 'History', render: () => <MobileSessionLog /> },
  { id: 'strength', label: 'Strength', render: () => <MobileStrength /> },
];

// What each pane's tab says; PANES keeps its English for code and tests.
export const PANE_MESSAGES = {
  load: msg({ message: 'Load', comment: 'Progress sub-tab: training load' }),
  history: msg({
    message: 'History',
    comment: 'Progress sub-tab: past sessions',
  }),
  strength: msg({ message: 'Strength', comment: 'Progress sub-tab' }),
};

export { PANES };

export default function MobileProgress() {
  const { t, i18n } = useLingui();
  const [pane, setPane] = useState(PANES[0].id);
  const active = PANES.find((p) => p.id === pane) ?? PANES[0];

  return (
    <div style={{ background: THEME.bg, minHeight: '100vh' }}>
      <div
        role="tablist"
        aria-label={t`Progress`}
        style={{
          display: 'flex',
          gap: SPACE.xs,
          // The sign-out chip is fixed at top 8px with zIndex 1000, and this
          // strip is the only destination whose first element spans the full
          // width — every other one opens on a header with dead space at the
          // right. Without clearance the chip lands on the third tab and eats
          // "Strength". Mirrors the chip's own safe-area inset so it also
          // clears on a notched device.
          padding: `calc(${SPACE.xxl}px + env(safe-area-inset-top, 0px)) ${SPACE.lg}px 0`,
        }}
      >
        {PANES.map((p) => {
          const on = p.id === active.id;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={on}
              onClick={() => setPane(p.id)}
              style={{
                flex: 1,
                border: 'none',
                borderRadius: RADIUS.sm,
                padding: `${SPACE.sm}px`,
                background: on ? THEME.surface : 'transparent',
                boxShadow: on ? `0 1px 2px ${alpha(THEME.text, '1a')}` : 'none',
                color: on ? THEME.accent : THEME.textSubtle,
                fontSize: TYPE.label.size,
                fontWeight: TYPE.label.weight,
                letterSpacing: TYPE.label.letterSpacing,
                fontFamily: FONT.sans,
                cursor: 'pointer',
              }}
            >
              {i18n._(PANE_MESSAGES[p.id])}
            </button>
          );
        })}
      </div>
      {active.render()}
      {/* Progress is where the user reviews whether the log is complete, so the
          import's health belongs at the foot of it. Deliberately NOT a sixth
          destination — DESTINATIONS is the fixed five from DESIGN_BRIEF.md §2.2. */}
      <StravaConnectPanel compact />
    </div>
  );
}
