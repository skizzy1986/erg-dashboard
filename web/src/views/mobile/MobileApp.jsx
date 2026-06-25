import React, { useState } from 'react';
import MobileAnalytics from './MobileAnalytics.jsx';
import BottomTabBar from '../../components/mobile/BottomTabBar.jsx';
import ErgLiveView from '../ErgLiveView.jsx';

function PlaceholderCard({ message }) {
  return (
    <div
      style={{
        margin: 16,
        background: '#2a2a48',
        borderRadius: 12,
        padding: '40px 20px',
        textAlign: 'center',
        color: '#7e7e9a',
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

export default function MobileApp() {
  const [activeTab, setActiveTab] = useState('analytics');

  let content;
  if (activeTab === 'analytics') {
    content = <MobileAnalytics />;
  } else if (activeTab === 'erg') {
    content = <ErgLiveView />;
  } else if (activeTab === 'log') {
    content = <PlaceholderCard message="Session Log — coming soon" />;
  } else if (activeTab === 'strength') {
    content = <PlaceholderCard message="Strength Logger — coming soon" />;
  } else {
    content = <PlaceholderCard message="Recovery — coming soon" />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom))',
      }}
    >
      {content}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
