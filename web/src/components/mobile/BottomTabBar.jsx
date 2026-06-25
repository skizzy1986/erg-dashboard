import React from 'react';

const TABS = [
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'erg', label: 'Live', icon: '🚣' },
  { id: 'log', label: 'Log', icon: '📝' },
  { id: 'strength', label: 'Strength', icon: '💪' },
  { id: 'recovery', label: 'Recovery', icon: '❤️' },
];

export default function BottomTabBar({ activeTab, onTabChange }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 56,
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        background: '#2a2a48',
        borderTop: '1px solid #4a4a68',
      }}
    >
      {TABS.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 56,
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
              fontSize: 9,
              letterSpacing: 1,
              fontWeight: activeTab === id ? 700 : 400,
              color: activeTab === id ? '#34d399' : '#7e7e9a',
            }}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
