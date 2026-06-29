import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const useVitalsMock = vi.fn();
const useTSSHistoryMock = vi.fn();
vi.mock('../../../hooks/useVitals.js', () => ({
  useVitals: () => useVitalsMock(),
}));
vi.mock('../../../hooks/useTSSHistory.js', () => ({
  useTSSHistory: () => useTSSHistoryMock(),
}));

import MobileRecovery from '../MobileRecovery.jsx';

beforeEach(() => {
  useVitalsMock.mockReset();
  useTSSHistoryMock.mockReset();
  useTSSHistoryMock.mockReturnValue({ data: [] });
});

describe('MobileRecovery', () => {
  it('renders the loading state', () => {
    useVitalsMock.mockReturnValue({
      isLoading: true,
      latest: null,
      readinessScore: 0,
      readinessLabel: 'READY',
    });
    render(<MobileRecovery />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders the no-vitals state', () => {
    useVitalsMock.mockReturnValue({
      isLoading: false,
      latest: null,
      readinessScore: 0,
      readinessLabel: 'READY',
    });
    render(<MobileRecovery />);
    expect(screen.getByText('No vitals recorded yet')).toBeInTheDocument();
  });

  it('renders readiness and metric cards including sleep score', () => {
    useVitalsMock.mockReturnValue({
      isLoading: false,
      latest: { rhr: 55, hrv: 35, sleep: 7.5, sleep_score: 85 },
      readinessScore: 88,
      readinessLabel: 'READY',
    });
    render(<MobileRecovery />);
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('Train as planned')).toBeInTheDocument();
    expect(screen.getByText('RESTING HR')).toBeInTheDocument();
    expect(screen.getByText('SLEEP SCORE')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('falls back to the TSB card when sleep score is absent', () => {
    useVitalsMock.mockReturnValue({
      isLoading: false,
      latest: { rhr: 55, hrv: 35, sleep: 7.5, sleep_score: null },
      readinessScore: 70,
      readinessLabel: 'CAUTION',
    });
    render(<MobileRecovery />);
    expect(screen.getByText('FORM / TSB')).toBeInTheDocument();
    expect(screen.queryByText('SLEEP SCORE')).not.toBeInTheDocument();
  });
});
