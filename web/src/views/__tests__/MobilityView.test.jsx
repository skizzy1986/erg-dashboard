import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as logs from '../../constants/logs.js';

// The tracked log is sessions rows (type='mobility') via useMobilitySessions.
const useMobilityMock = vi.fn();
vi.mock('../../hooks/useMobilitySessions.js', () => ({
  useMobilitySessions: () => useMobilityMock(),
}));

import MobilityView from '../MobilityView.jsx';

const state = (over = {}) => ({
  entries: [],
  isLoading: false,
  isError: false,
  ...over,
});

beforeEach(() => {
  useMobilityMock.mockReset();
  useMobilityMock.mockReturnValue(state());
});

describe('MobilityView', () => {
  it('renders the routines library and tracking sections', () => {
    render(<MobilityView />);
    expect(
      screen.getByText(/MOBILITY — a training pillar/i)
    ).toBeInTheDocument();
    expect(screen.getByText('ROUTINES · ON HAND')).toBeInTheDocument();
    expect(screen.getByText('Foam Roll / Soft Tissue')).toBeInTheDocument();
    expect(screen.getByText('RECENT · TRACKED')).toBeInTheDocument();
  });

  it('expands and collapses a routine to reveal its blocks', () => {
    render(<MobilityView />);
    const routine = screen.getByText('Foam Roll / Soft Tissue');
    // Collapsed by default — block detail is hidden.
    expect(screen.queryByText(/Thoracic spine/i)).not.toBeInTheDocument();

    fireEvent.click(routine);
    expect(screen.getByText(/Thoracic spine/i)).toBeInTheDocument();
    // Rehab blocks carry a · REHAB tag.
    expect(screen.getAllByText(/· REHAB/i).length).toBeGreaterThan(0);

    // Clicking again collapses it (covers the toggle-to-null path).
    fireEvent.click(routine);
    expect(screen.queryByText(/Thoracic spine/i)).not.toBeInTheDocument();
  });

  it('shows explicit empty copy on a fresh DB', () => {
    render(<MobilityView />);
    expect(screen.getByText('No mobility sessions logged')).toBeInTheDocument();
  });

  it('shows loading and error states', () => {
    useMobilityMock.mockReturnValue(state({ isLoading: true }));
    const { unmount } = render(<MobilityView />);
    expect(screen.getByText(/Loading mobility sessions/)).toBeInTheDocument();
    unmount();
    useMobilityMock.mockReturnValue(state({ isError: true }));
    render(<MobilityView />);
    expect(screen.getByText(/Mobility log unavailable/)).toBeInTheDocument();
  });

  it('renders logged mobility sessions from the hook', () => {
    useMobilityMock.mockReturnValue(
      state({
        entries: [
          {
            id: 1,
            date: '1/2/26',
            label: 'Example foam session',
            duration: '10min',
            note: 'Example note',
          },
          {
            id: 2,
            date: '1/1/26',
            label: 'Example stretch',
            duration: '',
            note: '',
          },
        ],
      })
    );
    render(<MobilityView />);
    const rows = screen.getAllByTestId('mobility-entry');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Example foam session');
    expect(rows[0]).toHaveTextContent('1/2/26 · 10min');
    expect(rows[0]).toHaveTextContent('Example note');
    expect(
      screen.queryByText('No mobility sessions logged')
    ).not.toBeInTheDocument();
  });

  it('no longer ships a mobility log constant', () => {
    expect(logs).not.toHaveProperty('mobilityLog');
  });
});
