import React from 'react';
import StravaConnectPanel from '../components/StravaConnectPanel.jsx';
import { THEME } from '../constants/theme.js';
import { FONT } from '../constants/type.js';
import { RADIUS, SPACE, TYPE } from '../constants/tokens.js';

// Deliberately thin. Strava is the first integration to need a home; Garmin,
// Concept2 and the rest land here as sibling panels rather than growing another
// tab each.
export default function SettingsView({ onSynced, notice }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.lg,
        fontFamily: FONT.sans,
      }}
    >
      <div>
        <div
          style={{
            fontSize: TYPE.micro.size,
            fontWeight: TYPE.micro.weight,
            letterSpacing: TYPE.micro.letterSpacing,
            color: THEME.accent,
          }}
        >
          SETTINGS
        </div>
        <div
          style={{
            fontSize: TYPE.title.size,
            fontWeight: TYPE.title.weight,
            letterSpacing: TYPE.title.letterSpacing,
            color: THEME.textStrong,
            marginTop: SPACE.xs,
          }}
        >
          Integrations
        </div>
      </div>
      {/* The OAuth outcome, routed here by App.jsx's callback effect. */}
      {notice && (
        <div
          role="status"
          style={{
            border: `1px solid ${THEME[notice.tone] ?? THEME.border}`,
            borderRadius: RADIUS.sm,
            padding: `${SPACE.md}px`,
            color: THEME[notice.tone] ?? THEME.text,
            fontSize: TYPE.bodySm.size,
            lineHeight: TYPE.bodySm.lineHeight,
          }}
        >
          {notice.text}
        </div>
      )}
      <StravaConnectPanel onSynced={onSynced} />
    </div>
  );
}
