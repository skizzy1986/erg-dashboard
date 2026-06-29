import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import MobileAnalytics from './MobileAnalytics.jsx';
import MobileSessionLog from './MobileSessionLog.jsx';
import MobileStrength from './MobileStrength.jsx';
import MobileRecovery from './MobileRecovery.jsx';
import BottomTabBar from '../../components/mobile/BottomTabBar.jsx';
import ErgLiveView from '../ErgLiveView.jsx';
import CoachView from '../CoachView.jsx';

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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = App.addListener('backButton', () => {
      if (activeTab !== 'analytics') {
        setActiveTab('analytics');
      } else {
        App.minimizeApp();
      }
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, [activeTab]);

  let content;
  if (activeTab === 'analytics') {
    content = <MobileAnalytics />;
  } else if (activeTab === 'erg') {
    content = <ErgLiveView />;
  } else if (activeTab === 'log') {
    content = <MobileSessionLog />;
  } else if (activeTab === 'strength') {
    content = <MobileStrength />;
  } else if (activeTab === 'coach') {
    content = <CoachView />;
  } else {
    content = <MobileRecovery />;
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
