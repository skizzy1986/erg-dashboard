import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StrengthView from '../StrengthView.jsx';

const strengthTrend = {
  'Back Squat': [
    { date: '6/3', e1rm: 109.7 },
    { date: '6/9', e1rm: 118.0 },
  ],
  // Single data point → exercises the empty-state branch when selected.
  'Bench Press': [{ date: '6/3', e1rm: 63.4 }],
};

const strengthSessions = [
  { type: 'strength', label: 'Upper A', date: '6/9', exercises: ['Bench 3x5'] },
];

describe('StrengthView', () => {
  it('renders the default lift trend, templates, and sessions', () => {
    render(
      <StrengthView
        strengthTrend={strengthTrend}
        strengthSessions={strengthSessions}
      />
    );
    // Default active lift = Back Squat (multi-point → chart + delta callout).
    expect(screen.getByText(/BACK SQUAT · e1RM/i)).toBeInTheDocument();
    expect(screen.getByText(/118kg/)).toBeInTheDocument();
    expect(screen.getByText('+8.3kg')).toBeInTheDocument();
    expect(screen.getByText(/SAVED TEMPLATES/i)).toBeInTheDocument();
    expect(screen.getByText('STRENGTH SESSIONS')).toBeInTheDocument();
  });

  it('switches to a single-point lift and shows the empty-state copy', () => {
    render(
      <StrengthView
        strengthTrend={strengthTrend}
        strengthSessions={strengthSessions}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Bench Press' }));
    expect(screen.getByText(/BENCH PRESS · e1RM/i)).toBeInTheDocument();
    expect(screen.getByText(/One data point/i)).toBeInTheDocument();
  });
});
