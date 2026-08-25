import React from 'react';
import { THEME } from '../../constants/theme.js';
import { LAYER, TYPE } from '../../constants/tokens.js';
import { DESTINATIONS } from '../../constants/destinations.js';

// The artboards draw a 64px bar; 56 was the old value.
export const TAB_BAR_HEIGHT = 64;

export default function BottomTabBar({ activeTab, onTabChange }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: LAYER.nav,
        height: TAB_BAR_HEIGHT,
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        background: THEME.raised,
        borderTop: `1px solid ${THEME.border}`,
      }}
    >
      {DESTINATIONS.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: TAB_BAR_HEIGHT,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1, marginBottom: 2 }}>
            {icon}
          </span>
          <span
            style={{
              fontSize: TYPE.caption.size,
              letterSpacing: 1,
              fontWeight: TYPE.label.weight,
              color: activeTab === id ? THEME.accent : THEME.textSubtle,
            }}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
