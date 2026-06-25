import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const useSessionsMock = vi.fn();
const useTSSHistoryMock = vi.fn();
vi.mock('../../../hooks/useSessions.js', () => ({
  useSessions: () => useSessionsMock(),
}));
vi.mock('../../../hooks/useTSSHistory.js', () => ({
  useTSSHistory: () => useTSSHistoryMock(),
}));

import MobileAnalytics from '../MobileAnalytics.jsx';

beforeEach(() => {
  useSessionsMock.mockReset();
  useTSSHistoryMock.mockReset();
  useTSSHistoryMock.mockReturnValue({ data: [] });
});

describe('MobileAnalytics recent sessions', () => {
  it('shows live logged sessions when available', () => {
    useSessionsMock.mockReturnValue({
      data: [
        {
          id: 1,
          date: '2026-06-24',
          type: 'Erg',
          label: 'Live row',
          duration: 90,
          srpe: 6,
          status: 'logged',
        },
      ],
    });
    render(<MobileAnalytics />);
    expect(screen.getByText('Live row')).toBeInTheDocument();
    // 90 * 6 / 60 = 9
    expect(screen.getByText('9 TSS')).toBeInTheDocument();
    // the seed list should not be used when live data exists
    expect(screen.queryByText('5k erg')).not.toBeInTheDocument();
  });

  it('falls back to the DAILY_TSS seed when no live sessions exist', () => {
    useSessionsMock.mockReturnValue({ data: [] });
    render(<MobileAnalytics />);
    expect(
      screen.getByText('60min UT1 long row (sRPE 6 — first full hour)')
    ).toBeInTheDocument();
  });

  it('excludes planned sessions from the recent list', () => {
    useSessionsMock.mockReturnValue({
      data: [
        {
          id: 2,
          date: '2026-06-26',
          type: 'Erg',
          label: 'Planned row',
          duration: 60,
          srpe: 5,
          status: 'planned',
        },
      ],
    });
    render(<MobileAnalytics />);
    // A planned-only list yields no recent logged sessions, so the recent
    // list falls back to the seed (the planned row surfaces under UPCOMING).
    expect(
      screen.getByText('60min UT1 long row (sRPE 6 — first full hour)')
    ).toBeInTheDocument();
  });
});
