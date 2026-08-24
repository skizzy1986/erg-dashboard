import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import {
  QueryClient,
  QueryCache,
  MutationCache,
  QueryClientProvider,
} from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { BluetoothLowEnergy } from '@capgo/capacitor-bluetooth-low-energy';
import AuthGate from './AuthGate.jsx';
import { createNotificationChannels } from './utils/notifications.js';
import { initSentry } from './utils/sentry.js';
import {
  handleQueryError,
  handleMutationError,
} from './utils/queryErrorHandlers.js';
import ErrorFallback from './components/ErrorFallback.jsx';
import { THEME } from './constants/theme.js';
import { cssVars } from './utils/themeCss.js';

initSentry();

const themeStyle = document.createElement('style');
themeStyle.id = 'theme-vars';
themeStyle.textContent = cssVars(THEME);
document.head.appendChild(themeStyle);

if (Capacitor.isNativePlatform()) {
  BluetoothLowEnergy.shimWebBluetooth();
  createNotificationChannels();
}

// The caches are where Supabase failures surface. Without these handlers every
// hook that throws into react-query died there unreported — see
// utils/queryErrorHandlers.js.
const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleQueryError }),
  mutationCache: new MutationCache({ onError: handleMutationError }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Reads DO report to Sentry through the QueryCache sink — the
      // read-vs-write asymmetry once observed was this retry's backoff delaying
      // onError, not a swallowed error. Investigated and closed in #276; the
      // mutation path simply has no retry override, so it lands near-instantly.
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}
    >
      <QueryClientProvider client={queryClient}>
        <AuthGate />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
