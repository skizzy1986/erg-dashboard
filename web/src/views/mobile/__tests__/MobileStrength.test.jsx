import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const hookState = vi.fn();
vi.mock('../../../hooks/useStrengthPRs.js', () => ({
  useStrengthPRs: () => hookState(),
}));

import MobileStrength from '../MobileStrength.jsx';

const EMPTY = /No strength PRs yet/i;

describe('MobileStrength', () => {
  beforeEach(() => hookState.mockReset());

  it('renders a row whatever its exercise name, and no empty copy', () => {
    hookState.mockReturnValue({
      data: [
        {
          exercise_name: 'Barbell Squat',
          best_e1rm_kg: null,
          heaviest_kg: null,
          logged_sets: 2,
        },
        {
          exercise_name: 'Lift B',
          best_e1rm_kg: 33,
          heaviest_kg: 30,
          logged_sets: 1,
        },
      ],
      isLoading: false,
      isError: false,
    });
    render(<MobileStrength />);
    expect(screen.getByText('Barbell Squat')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('33.0kg')).toBeInTheDocument();
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();
  });

  it('shows the empty copy only once loaded with no rows', () => {
    hookState.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<MobileStrength />);
    expect(screen.getByText(EMPTY)).toBeInTheDocument();
  });

  it('shows loading, not the empty copy, while pending', () => {
    hookState.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    render(<MobileStrength />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();
  });

  it('shows "unavailable" on error, not the empty copy', () => {
    hookState.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    render(<MobileStrength />);
    expect(
      screen.getByText(/Strength records unavailable/)
    ).toBeInTheDocument();
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();
  });
});
