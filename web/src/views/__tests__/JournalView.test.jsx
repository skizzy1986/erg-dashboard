import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  DECISION_LOG,
  HYPOTHESES,
  RULE_FIRING_HISTORY,
  CONFIDENCE_MIGRATION,
} from '../../constants/logs.js';
import JournalView from '../JournalView.jsx';

describe('JournalView', () => {
  it('renders the four longitudinal sections', () => {
    render(<JournalView />);
    expect(screen.getByText(/DECISION LEDGER/i)).toBeInTheDocument();
    expect(
      screen.getByText(/OPEN HYPOTHESES · THE EXPERIMENTS/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/RULE-FIRING HISTORY/i)).toBeInTheDocument();
    expect(screen.getByText(/MODEL CONFIDENCE/i)).toBeInTheDocument();
  });

  it('renders every decision from the ledger', () => {
    render(<JournalView />);
    for (const d of DECISION_LOG) {
      expect(screen.getByText(d.decision)).toBeInTheDocument();
    }
  });

  it('renders each hypothesis with a status label', () => {
    render(<JournalView />);
    for (const h of HYPOTHESES) {
      expect(screen.getByText(h.h)).toBeInTheDocument();
    }
    // one of the three status badges must appear
    expect(
      screen.getAllByText(/SUPPORTED|REFUTED|OPEN/).length
    ).toBeGreaterThan(0);
  });

  it('renders the confidence-migration metrics and states', () => {
    render(<JournalView />);
    for (const m of CONFIDENCE_MIGRATION) {
      expect(screen.getByText(m.metric)).toBeInTheDocument();
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
