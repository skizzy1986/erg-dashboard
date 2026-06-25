import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const useStrengthPRsMock = vi.fn();
vi.mock('../../../hooks/useStrengthPRs.js', () => ({
  useStrengthPRs: () => useStrengthPRsMock(),
}));
vi.mock('../../../StrengthLogger.jsx', () => ({
  default: () => <div>STRENGTH LOGGER VIEW</div>,
}));

import MobileStrength from '../MobileStrength.jsx';

beforeEach(() => useStrengthPRsMock.mockReset());

describe('MobileStrength', () => {
  it('renders the loading state', () => {
    useStrengthPRsMock.mockReturnValue({ data: undefined, isLoading: true });
    render(<MobileStrength />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders the empty state', () => {
    useStrengthPRsMock.mockReturnValue({ data: [], isLoading: false });
    render(<MobileStrength />);
    expect(
      screen.getByText('No strength PRs yet — log your first session')
    ).toBeInTheDocument();
  });

  it('renders the PR grid', () => {
    useStrengthPRsMock.mockReturnValue({
      data: [
        {
          exercise_name: 'Back Squat',
          best_e1rm_kg: 142.5,
          heaviest_kg: 130,
          logged_sets: 12,
        },
      ],
      isLoading: false,
    });
    render(<MobileStrength />);
    expect(screen.getByText('Back Squat')).toBeInTheDocument();
    expect(screen.getByText('142.5kg')).toBeInTheDocument();
    expect(screen.getByText('Heaviest: 130kg')).toBeInTheDocument();
  });

  it('opens the strength logger', () => {
    useStrengthPRsMock.mockReturnValue({ data: [], isLoading: false });
    render(<MobileStrength />);
    fireEvent.click(screen.getByText('OPEN STRENGTH LOGGER'));
    expect(screen.getByText('STRENGTH LOGGER VIEW')).toBeInTheDocument();
  });
});
