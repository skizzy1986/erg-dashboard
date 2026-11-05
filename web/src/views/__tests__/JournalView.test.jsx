import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import * as logs from '../../constants/logs.js';
import { RULE_FIRING_HISTORY } from '../../constants/logs.js';

// Decisions/hypotheses come from useCoachLog, the confidence panel from
// useAnchors. All hook data is synthetic.
const useCoachLogMock = vi.fn();
vi.mock('../../hooks/useCoachLog.js', () => ({
  useCoachLog: () => useCoachLogMock(),
}));
const useAnchorsMock = vi.fn();
vi.mock('../../hooks/useAnchors.js', () => ({
  useAnchors: () => useAnchorsMock(),
}));

import JournalView from '../JournalView.jsx';

const logState = (over = {}) => ({
  decisions: [],
  hypotheses: [],
  isLoading: false,
  isError: false,
  ...over,
});

beforeEach(() => {
  useCoachLogMock.mockReset();
  useAnchorsMock.mockReset();
  useCoachLogMock.mockReturnValue(logState());
  useAnchorsMock.mockReturnValue({ anchors: {}, isLoading: false });
});

describe('JournalView', () => {
  it('renders the four longitudinal sections', () => {
    render(<JournalView />);
    expect(screen.getByText(/DECISION LEDGER/i)).toBeInTheDocument();
    expect(
      screen.getByText(/HYPOTHESES · THE EXPERIMENTS/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/RULE-FIRING HISTORY/i)).toBeInTheDocument();
    expect(screen.getByText(/MODEL CONFIDENCE/i)).toBeInTheDocument();
  });

  it('shows the loading state', () => {
    useCoachLogMock.mockReturnValue(logState({ isLoading: true }));
    render(<JournalView />);
    expect(screen.getAllByText('Loading journal…').length).toBeGreaterThan(0);
  });

  it('shows the error state', () => {
    useCoachLogMock.mockReturnValue(logState({ isError: true }));
    render(<JournalView />);
    expect(
      screen.getAllByText("Journal unavailable — couldn't reach the database")
        .length
    ).toBeGreaterThan(0);
  });

  it('shows explicit empty copy on a fresh DB', () => {
    render(<JournalView />);
    expect(
      screen.getByText(
        'No decisions recorded yet — Coach writes them to coach_log'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('No hypotheses recorded yet')).toBeInTheDocument();
  });

  it('renders decisions and marks superseded ones', () => {
    useCoachLogMock.mockReturnValue(
      logState({
        decisions: [
          {
            id: 'd2',
            date: '2026-01-02',
            headline: 'Example decision B',
            detail: 'Example reasoning B',
            tags: [],
            superseded: false,
          },
          {
            id: 'd1',
            date: '2026-01-01',
            headline: 'Example decision A',
            detail: '',
            tags: [],
            superseded: true,
          },
        ],
      })
    );
    render(<JournalView />);
    const rows = screen.getAllByTestId('decision');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Example decision B');
    expect(rows[0]).toHaveTextContent('→ Example reasoning B');
    expect(rows[0]).not.toHaveTextContent('superseded');
    expect(rows[1]).toHaveTextContent('superseded');
  });

  it('renders each hypothesis with its status label', () => {
    useCoachLogMock.mockReturnValue(
      logState({
        hypotheses: [
          {
            id: 'h1',
            statement: 'Example H1',
            status: 'supported',
            evidence: 'e1',
          },
          {
            id: 'h2',
            statement: 'Example H2',
            status: 'refuted',
            evidence: 'e2',
          },
          {
            id: 'h3',
            statement: 'Example H3',
            status: 'firming',
            evidence: '',
          },
          { id: 'h4', statement: 'Example H4', status: 'open', evidence: '' },
        ],
      })
    );
    render(<JournalView />);
    expect(screen.getByText('Example H1')).toBeInTheDocument();
    expect(screen.getByText('✓ SUPPORTED')).toBeInTheDocument();
    expect(screen.getByText('✗ REFUTED')).toBeInTheDocument();
    expect(screen.getByText('◐ FIRMING')).toBeInTheDocument();
    expect(screen.getByText('○ OPEN')).toBeInTheDocument();
  });

  it('derives the confidence panel from live anchors with statuses', () => {
    useAnchorsMock.mockReturnValue({
      isLoading: false,
      anchors: {
        rowing_cp: {
          key: 'rowing_cp',
          value: '200',
          unit: 'W',
          status: 'provisional',
        },
        drag_factor: {
          key: 'drag_factor',
          value: '120',
          unit: 'df',
          status: 'confirmed',
        },
      },
    });
    render(<JournalView />);
    expect(screen.getByText('200 W (provisional)')).toBeInTheDocument();
    expect(screen.getByText('PROVISIONAL')).toBeInTheDocument();
    expect(screen.getByText('120 df (confirmed)')).toBeInTheDocument();
    expect(
      screen.getByText('anchors.bike_ftp — not recorded')
    ).toBeInTheDocument();
    expect(screen.getAllByText('NOT SET').length).toBe(3);
  });

  it('no longer ships the journal as constants', () => {
    for (const name of ['DECISION_LOG', 'HYPOTHESES', 'CONFIDENCE_MIGRATION']) {
      expect(logs).not.toHaveProperty(name);
    }
  });

  it('shows fired rule ids and a "clear" marker for quiet days', () => {
    render(<JournalView />);
    const hasFired = RULE_FIRING_HISTORY.some((f) => f.fired.length);
    const hasClear = RULE_FIRING_HISTORY.some((f) => !f.fired.length);
    if (hasClear) {
      expect(screen.getAllByText(/^clear$/).length).toBeGreaterThan(0);
    }
    if (hasFired) {
      const firedExample = RULE_FIRING_HISTORY.find((f) => f.fired.length);
      expect(
        screen.getAllByText(new RegExp(firedExample.fired[0])).length
      ).toBeGreaterThan(0);
    }
  });
});
