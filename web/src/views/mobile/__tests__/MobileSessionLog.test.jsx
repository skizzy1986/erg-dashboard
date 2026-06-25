import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const useSessionsMock = vi.fn();
vi.mock('../../../hooks/useSessions.js', () => ({
  useSessions: () => useSessionsMock(),
}));

import MobileSessionLog from '../MobileSessionLog.jsx';

beforeEach(() => useSessionsMock.mockReset());

describe('MobileSessionLog', () => {
  it('renders the loading state', () => {
    useSessionsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    render(<MobileSessionLog />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders the error state', () => {
    useSessionsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    });
    render(<MobileSessionLog />);
    expect(screen.getByText('Failed to load sessions')).toBeInTheDocument();
  });

  it('renders the empty state', () => {
    useSessionsMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    render(<MobileSessionLog />);
    expect(screen.getByText('No sessions found')).toBeInTheDocument();
  });

  it('lists sessions and filters by type', () => {
    useSessionsMock.mockReturnValue({
      data: [
        {
          id: 1,
          date: '2026-06-20',
          type: 'Erg',
          label: 'Morning row',
          duration: 60,
          srpe: 6,
          avg_watts: 200,
        },
        {
          id: 2,
          date: '2026-06-19',
          type: 'Strength',
          label: 'Lower body',
          duration: 45,
          srpe: 7,
        },
      ],
      isLoading: false,
      error: null,
    });
    render(<MobileSessionLog />);
    expect(screen.getByText('Morning row')).toBeInTheDocument();
    expect(screen.getByText('Lower body')).toBeInTheDocument();
    expect(screen.getByText('2 logged')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Strength'));
    expect(screen.queryByText('Morning row')).not.toBeInTheDocument();
    expect(screen.getByText('Lower body')).toBeInTheDocument();
  });
});
