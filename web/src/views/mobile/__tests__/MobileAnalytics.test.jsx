import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MobileAnalytics from '../MobileAnalytics.jsx';

const mockUseTSSHistory = vi.fn();
const mockUseSessions = vi.fn();

vi.mock('../../../hooks/useTSSHistory.js', () => ({
  useTSSHistory: () => mockUseTSSHistory(),
}));
vi.mock('../../../hooks/useSessions.js', () => ({
  useSessions: () => mockUseSessions(),
}));

beforeEach(() => {
  mockUseTSSHistory.mockReset();
  mockUseSessions.mockReset();
});

describe('MobileAnalytics', () => {
  it('falls back to the DAILY_TSS seed when both hooks return empty', () => {
    mockUseTSSHistory.mockReturnValue({ data: [] });
    mockUseSessions.mockReturnValue({ data: [] });
    render(<MobileAnalytics />);
    // last entry in constants/tssData.js
    expect(
      screen.getByText('60min UT1 long row (sRPE 6 — first full hour)')
    ).toBeInTheDocument();
  });

  it('renders live recent sessions when useSessions returns completed rows', () => {
    mockUseTSSHistory.mockReturnValue({ data: [] });
    mockUseSessions.mockReturnValue({
      data: [
        {
          id: 1,
          date: '7/1/26',
          type: 'erg',
          label: 'UT1 row',
          duration: '45:00',
          srpe: 6,
          status: 'actual',
        },
      ],
    });
    render(<MobileAnalytics />);
    expect(screen.getByText('UT1 row')).toBeInTheDocument();
    expect(screen.getByText('7/1/26')).toBeInTheDocument();
  });

  it('excludes non-completed sessions from the live recent list', () => {
    // A completed session populates the recent list; a cancelled one must not
    // appear. (A 'planned' status is deliberately avoided here because it would
    // surface in the separate UPCOMING section, which is out of scope for this
    // recent-list assertion.)
    mockUseTSSHistory.mockReturnValue({ data: [] });
    mockUseSessions.mockReturnValue({
      data: [
        {
          id: 2,
          date: '6/30/26',
          type: 'erg',
          label: 'Cancelled row',
          duration: '45:00',
          srpe: 6,
          status: 'cancelled',
        },
        {
          id: 3,
          date: '7/1/26',
          type: 'erg',
          label: 'Done row',
          duration: '45:00',
          srpe: 6,
          status: 'completed',
        },
      ],
    });
    render(<MobileAnalytics />);
    expect(screen.getByText('Done row')).toBeInTheDocument();
    expect(screen.queryByText('Cancelled row')).not.toBeInTheDocument();
  });

  it('includes live PM5-logged sessions (status "logged"), not just actual/completed', () => {
    // ErgLiveView.jsx (the live PM5 Bluetooth save path) writes new sessions
    // with status: 'logged' — these must count as "done" here too, or newly
    // logged erg sessions would silently vanish from this list.
    mockUseTSSHistory.mockReturnValue({ data: [] });
    mockUseSessions.mockReturnValue({
      data: [
        {
          id: 5,
          date: '7/1/26',
          type: 'erg',
          label: 'Live PM5 row',
          duration: '20:00',
          srpe: 6,
          status: 'logged',
        },
      ],
    });
    render(<MobileAnalytics />);
    expect(screen.getByText('Live PM5 row')).toBeInTheDocument();
  });

  it('sorts multiple completed sessions most-recent-first regardless of text order', () => {
    mockUseTSSHistory.mockReturnValue({ data: [] });
    mockUseSessions.mockReturnValue({
      data: [
        {
          id: 3,
          date: '6/2/26',
          label: 'Early June',
          duration: '30min',
          srpe: 5,
          status: 'actual',
        },
        {
          id: 4,
          date: '6/12/26',
          label: 'Mid June',
          duration: '30min',
          srpe: 5,
          status: 'completed',
        },
      ],
    });
    render(<MobileAnalytics />);
    const mid = screen.getByText('Mid June');
    const early = screen.getByText('Early June');
    // DOCUMENT_POSITION_FOLLOWING (0x04): early comes after mid in the DOM,
    // proving Mid June (6/12) renders before Early June (6/2).
    const FOLLOWING = 0x04;
    expect(mid.compareDocumentPosition(early) & FOLLOWING).toBeTruthy();
  });

  it('renders CTL/ATL/TSB tiles using calcTrainingLoad output without crashing', () => {
    mockUseTSSHistory.mockReturnValue({
      data: [{ date: '2026-06-13', tss: 50 }],
    });
    mockUseSessions.mockReturnValue({ data: [] });
    render(<MobileAnalytics />);
    expect(screen.getByText('FORM / TSB')).toBeInTheDocument();
    expect(screen.getByText('FITNESS / CTL')).toBeInTheDocument();
    expect(screen.getByText('FATIGUE / ATL')).toBeInTheDocument();
  });
});
