import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockSessions = vi.fn();
const mockVitals = vi.fn();
const mockTss = vi.fn();
const mockAnchors = vi.fn();
vi.mock('../../../hooks/useSessions.js', () => ({
  useSessions: () => mockSessions(),
}));
vi.mock('../../../hooks/useVitals.js', () => ({
  useVitals: () => mockVitals(),
}));
vi.mock('../../../hooks/useTSSHistory.js', () => ({
  useTSSHistory: () => mockTss(),
}));
vi.mock('../../../hooks/useAnchors.js', () => ({
  useAnchors: () => mockAnchors(),
}));

import MobileToday from '../MobileToday.jsx';

const iso = (d) => d.toISOString().slice(0, 10);
const mdy = (d) =>
  `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
const today = new Date();
const daysAgo = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d;
};

beforeEach(() => {
  mockSessions.mockReturnValue({ data: [] });
  mockVitals.mockReturnValue({ readiness: { score: 91, status: 'READY' } });
  mockTss.mockReturnValue({ data: [], isLoading: false });
  mockAnchors.mockReturnValue({ anchors: {}, cp: 205 });
});

describe('readiness', () => {
  it('renders the score and status when there is one', () => {
    render(<MobileToday />);
    expect(screen.getByText('91')).toBeInTheDocument();
    expect(screen.getByText('READY')).toBeInTheDocument();
  });

  // computeReadiness returns null when RHR is missing. Rendering that as a
  // number — or as 0 — would state a confident low score the data does not
  // support. CLAUDE.md calls this out as a real state needing a design.
  it('says there is no reading rather than scoring zero', () => {
    mockVitals.mockReturnValue({ readiness: { score: null, status: null } });
    render(<MobileToday />);
    expect(screen.getByText(/No reading this morning/)).toBeInTheDocument();
    // Scoped to the readiness card: a 0 elsewhere on the screen is fine, a 0
    // presented as a readiness score is the failure being guarded against.
    const card = screen.getByText('READINESS').parentElement;
    expect(within(card).queryByText('0')).toBeNull();
  });

  it('says so when only some readings arrived', () => {
    mockVitals.mockReturnValue({
      readiness: { score: 74, status: 'CAUTION', partial: true },
    });
    render(<MobileToday />);
    expect(screen.getByText(/some were missing/)).toBeInTheDocument();
  });
});

describe("today's session", () => {
  it('says nothing is prescribed when nothing is', () => {
    render(<MobileToday />);
    expect(screen.getByText(/Nothing prescribed today/)).toBeInTheDocument();
  });

  it('shows a planned session and starts it', async () => {
    const user = userEvent.setup();
    mockSessions.mockReturnValue({
      data: [
        {
          id: 1,
          date: mdy(today),
          status: 'planned',
          label: 'UT1 4 x 10min',
          coach_note: 'Hold the easy end',
        },
      ],
    });
    const onStart = vi.fn();
    render(<MobileToday onStartSession={onStart} />);
    expect(screen.getByText('UT1 4 x 10min')).toBeInTheDocument();
    expect(screen.getByText('Hold the easy end')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /START SESSION/ }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('offers no start button for a session already completed', () => {
    mockSessions.mockReturnValue({
      data: [{ id: 1, date: mdy(today), status: 'completed', label: 'Done' }],
    });
    render(<MobileToday />);
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /START SESSION/ })).toBeNull();
  });
});

describe('this week', () => {
  it('counts completed against completed-plus-planned, not typed', () => {
    mockSessions.mockReturnValue({
      data: [
        { id: 1, date: mdy(today), status: 'completed', duration: 60, srpe: 5 },
        { id: 2, date: mdy(today), status: 'logged', duration: 45, srpe: 4 },
        { id: 3, date: mdy(today), status: 'planned' },
        // Well outside the current week — must not be counted.
        { id: 4, date: mdy(daysAgo(30)), status: 'completed', duration: 60 },
      ],
    });
    render(<MobileToday />);
    // "2" and "/3" are separate nodes, so assert on the tile as a whole.
    const tile = screen.getByText('SESSIONS').parentElement;
    expect(tile.textContent).toContain('2/3');
  });
});

describe('recent', () => {
  it('lists the three most recent completed sessions, newest first', () => {
    mockSessions.mockReturnValue({
      data: [1, 2, 3, 4].map((n) => ({
        id: n,
        date: mdy(daysAgo(n)),
        status: 'completed',
        label: `S${n}`,
        duration: 30,
      })),
    });
    render(<MobileToday />);
    const shown = ['S1', 'S2', 'S3'].map((l) => screen.getByText(l));
    expect(shown).toHaveLength(3);
    expect(screen.queryByText('S4')).toBeNull();
    expect(
      shown[0].compareDocumentPosition(shown[1]) &
        window.Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('excludes today from recent — that is what TODAY is for', () => {
    mockSessions.mockReturnValue({
      data: [
        { id: 1, date: mdy(today), status: 'completed', label: 'TODAYS' },
        { id: 2, date: mdy(daysAgo(2)), status: 'completed', label: 'EARLIER' },
      ],
    });
    render(<MobileToday />);
    expect(screen.getAllByText('TODAYS')).toHaveLength(1);
    expect(screen.getByText('EARLIER')).toBeInTheDocument();
  });
});

describe('the phase pill', () => {
  it('is absent when no anchor names a phase', () => {
    render(<MobileToday />);
    expect(screen.queryByText(/WK/)).toBeNull();
  });

  it('renders the live anchor, not a literal', () => {
    mockAnchors.mockReturnValue({
      anchors: {
        current_phase: { value: 'Base' },
        current_block: { value: 'wk 3/12' },
      },
      cp: 205,
    });
    render(<MobileToday />);
    expect(screen.getByText('BASE · WK 3/12')).toBeInTheDocument();
  });
});

describe('dates', () => {
  it('reads M/D/YY session dates, not just ISO', () => {
    // sessions.date is unpadded text M/D/YY; toISODate is what makes the
    // comparison valid. A naive string compare would drop these.
    expect(iso(today)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    mockSessions.mockReturnValue({
      data: [{ id: 1, date: mdy(today), status: 'planned', label: 'PARSED' }],
    });
    render(<MobileToday />);
    expect(screen.getByText('PARSED')).toBeInTheDocument();
  });
});
