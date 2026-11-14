import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const hookState = vi.fn();
vi.mock('../../hooks/useLiftHistory.js', () => ({
  useLiftHistory: () => hookState(),
}));

import StrengthView from '../StrengthView.jsx';

const strengthSessions = [
  {
    type: 'strength',
    label: 'Upper A',
    date: '1/9/01',
    exercises: ['Lift 3x5'],
  },
];

const loaded = (data) => ({ data, isPending: false, isError: false });

const lifts = {
  'Barbell Squat': [
    { date: '1/2/01', e1rm: 30 },
    { date: '1/9/01', e1rm: 35 },
  ],
  // Single data point → exercises the one-point branch when selected.
  'Lift B': [{ date: '1/2/01', e1rm: 20 }],
};

const renderView = () =>
  render(<StrengthView strengthSessions={strengthSessions} />);

describe('StrengthView', () => {
  beforeEach(() => hookState.mockReset());

  it('renders the first lift trend and sessions', () => {
    hookState.mockReturnValue(loaded({ lifts, setCount: 3, scoredCount: 3 }));
    renderView();
    expect(
      screen.getByRole('button', { name: 'Barbell Squat' })
    ).toBeInTheDocument();
    expect(screen.getByText(/BARBELL SQUAT · e1RM/i)).toBeInTheDocument();
    expect(screen.getByText('35kg')).toBeInTheDocument();
    expect(screen.getByText(/current e1RM · 1\/9\/01/)).toBeInTheDocument();
    expect(screen.getByText('+5.0kg')).toBeInTheDocument();
    expect(screen.queryByText(/SAVED TEMPLATES/i)).toBeNull();
    expect(screen.queryByText(/Prehab/)).toBeNull();
    expect(screen.getByText('STRENGTH SESSIONS')).toBeInTheDocument();
  });

  it('signs a falling trend correctly', () => {
    hookState.mockReturnValue(
      loaded({
        lifts: {
          'Lift C': [
            { date: '1/2/01', e1rm: 35 },
            { date: '1/9/01', e1rm: 30 },
          ],
        },
        setCount: 2,
        scoredCount: 2,
      })
    );
    renderView();
    expect(screen.getByText('-5.0kg')).toBeInTheDocument();
  });

  it('switches to a single-point lift and shows the one-point copy', () => {
    hookState.mockReturnValue(loaded({ lifts, setCount: 3, scoredCount: 3 }));
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Lift B' }));
    expect(screen.getByText(/LIFT B · e1RM/i)).toBeInTheDocument();
    expect(screen.getByText(/One data point/i)).toBeInTheDocument();
  });

  it('says nothing is logged when there are zero sets', () => {
    hookState.mockReturnValue(
      loaded({ lifts: {}, setCount: 0, scoredCount: 0 })
    );
    renderView();
    expect(
      screen.getByText('No strength sets logged yet.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/e1RM \(kg\)/)).not.toBeInTheDocument();
    expect(screen.getByText('STRENGTH SESSIONS')).toBeInTheDocument();
  });

  it('says sets exist but none can be scored', () => {
    hookState.mockReturnValue(
      loaded({ lifts: {}, setCount: 2, scoredCount: 0 })
    );
    renderView();
    expect(
      screen.getByText(
        '2 sets logged — none with weight and reps to estimate e1RM.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No strength sets logged yet.')
    ).not.toBeInTheDocument();
  });

  it('shows a loading state while pending', () => {
    hookState.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    });
    renderView();
    expect(screen.getByText('Loading strength history…')).toBeInTheDocument();
  });

  it('shows an error state when the query fails', () => {
    hookState.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    });
    renderView();
    expect(
      screen.getByText('Strength history unavailable.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No strength sets logged yet.')
    ).not.toBeInTheDocument();
  });
});
