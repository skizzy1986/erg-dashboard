import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// LogSessionForm (rendered by LogView) touches supabase — mock it out.
const getUserMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    auth: { getUser: (...args) => getUserMock(...args) },
    from: () => ({ insert: vi.fn().mockResolvedValue({ error: null }) }),
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

beforeEach(() => {
  getUserMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
});

describe('LogView', () => {
  it('renders the log form, sRPE scale, and logged sessions', () => {
    const loggedSessions = [
      { date: '6/9/26', type: 'erg', label: 'UT2 60min', srpe: 4 },
      { date: '6/8/26', type: 'strength', label: 'Upper A', srpe: 6 },
    ];

    renderWithClient(
      <LogView
        loggedSessions={loggedSessions}
        fetchSessions={vi.fn()}
        isWide={false}
      />
    );

    expect(screen.getByText(/SESSION LOG/i)).toBeInTheDocument();
    expect(screen.getByText(/sRPE SCALE/i)).toBeInTheDocument();
    expect(screen.getByText('UT2 60min')).toBeInTheDocument();
    expect(screen.getByText('Upper A')).toBeInTheDocument();
  });

  it('renders with no logged sessions', () => {
    renderWithClient(
      <LogView loggedSessions={[]} fetchSessions={vi.fn()} isWide={true} />
    );
    expect(screen.getByText(/SESSION LOG/i)).toBeInTheDocument();
  });
});
