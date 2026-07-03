import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MobileRecovery from '../MobileRecovery.jsx';

const mockUseVitals = vi.fn();
const mockUseVitalsSync = vi.fn();
const mockUseTSSHistory = vi.fn();

vi.mock('../../../hooks/useVitals.js', () => ({
  useVitals: () => mockUseVitals(),
}));
vi.mock('../../../hooks/useVitalsSync.js', () => ({
  useVitalsSync: () => mockUseVitalsSync(),
}));
vi.mock('../../../hooks/useTSSHistory.js', () => ({
  useTSSHistory: () => mockUseTSSHistory(),
}));

beforeEach(() => {
  mockUseVitals.mockReset();
  mockUseVitalsSync.mockReset();
  mockUseTSSHistory.mockReset();
});

describe('MobileRecovery', () => {
  it('renders a finite TSB from calcTrainingLoad with same-day aggregated entries', () => {
    mockUseVitals.mockReturnValue({
      isLoading: false,
      latest: { rhr: 50, hrv: 60, sleep: 7.5, sleep_score: null },
      readinessScore: 82,
      readinessLabel: 'READY',
      personalBaselines: { rhrBaseline: 50, hrvBaseline: 60 },
      vitalsHistory: [],
      history: [],
      hasPersonalBaselines: false,
    });
    mockUseVitalsSync.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
    });
    mockUseTSSHistory.mockReturnValue({
      data: [
        { date: '2026-06-13', tss: 30 },
        { date: '2026-06-13', tss: 20 },
      ],
    });

    render(<MobileRecovery />);

    // FORM / TSB tile shows because sleep_score is null
    const tsbTile = screen.getByText('FORM / TSB');
    expect(tsbTile).toBeInTheDocument();
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();

    // the rendered TSB value is a finite one-decimal number
    const value = tsbTile.parentElement.querySelector('div:last-child');
    expect(Number.isNaN(parseFloat(value.textContent))).toBe(false);
  });
});
