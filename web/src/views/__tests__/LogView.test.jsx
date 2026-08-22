import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// LogSessionForm (rendered by LogView) imports the supabase client and uses a
// react-query mutation, so mock the client and wrap in a QueryClientProvider.
vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: () => ({ insert: vi.fn() }),
  },
}));

import LogView from '../LogView.jsx';

function renderWithClient(ui) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

describe('LogView', () => {
  it('renders the session-log intro, sRPE reference, and logged entries', () => {
    const logDisplaySessions = [
      { type: 'strength', label: 'Upper A', date: '6/9' },
    ];
    renderWithClient(
      <LogView
        logDisplaySessions={logDisplaySessions}
        isWide={false}
        onSaved={vi.fn()}
      />
    );
    expect(screen.getByText(/SESSION LOG:/i)).toBeInTheDocument();
    expect(screen.getByText(/sRPE SCALE/i)).toBeInTheDocument();
    expect(screen.getByText('Upper A')).toBeInTheDocument();
  });

  it('AC13 renders every display entry, cancelled included', () => {
    const logDisplaySessions = [
      { type: 'strength', label: 'Upper A', date: '6/9', status: 'completed' },
      {
        type: 'erg',
        _isErg: true,
        label: 'CP RETEST — 1min + 4min max (rested, fed)',
        date: '7/5/26',
        status: 'cancelled',
      },
    ];
    renderWithClient(
      <LogView
        logDisplaySessions={logDisplaySessions}
        isWide={false}
        onSaved={vi.fn()}
      />
    );
    expect(screen.getByText('Upper A')).toBeInTheDocument();
    expect(screen.getByText(/CP RETEST/)).toBeInTheDocument();
    expect(screen.getByText('CANCELLED')).toBeInTheDocument();
  });
});
