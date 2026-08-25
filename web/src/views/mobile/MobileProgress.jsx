import React, { useState } from 'react';
import MobileAnalytics from './MobileAnalytics.jsx';
import MobileSessionLog from './MobileSessionLog.jsx';
import MobileStrength from './MobileStrength.jsx';
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

export default function MobileProgress() {
  const [pane, setPane] = useState(PANES[0].id);
  const active = PANES.find((p) => p.id === pane) ?? PANES[0];

  return (
    <div style={{ background: THEME.bg, minHeight: '100vh' }}>
      <div
        role="tablist"
        aria-label="Progress"
        style={{
          display: 'flex',
          gap: SPACE.xs,
          padding: `${SPACE.md}px ${SPACE.lg}px 0`,
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
              {p.label}
            </button>
          );
        })}
      </div>
      {active.render()}
    </div>
  );
}
