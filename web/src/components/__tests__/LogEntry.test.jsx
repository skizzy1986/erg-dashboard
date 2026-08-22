import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LogEntry from '../LogEntry.jsx';

describe('LogEntry', () => {
  it('renders a completed erg session and expands to the metric grid', () => {
    const entry = {
      type: 'erg',
      _isErg: true,
      label: 'UT2 60min',
      date: '6/19',
      duration: '60min',
      srpe: 6,
      distance_m: 12000,
      avg_watts: 150,
      avg_hr: 140,
      coachNote: 'steady aerobic',
    };
    render(<LogEntry entry={entry} done />);
    expect(screen.getByText('UT2 60min')).toBeInTheDocument();
    expect(screen.getByText('✓ DONE')).toBeInTheDocument();
    expect(screen.getByText(/sRPE 6/)).toBeInTheDocument();
    expect(screen.getByText(/150W/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('UT2 60min'));
    expect(screen.getByText('AVG WATTS')).toBeInTheDocument();
    expect(screen.getByText(/steady aerobic/)).toBeInTheDocument();
  });

  it('renders a strength session with PRs and an exercise table', () => {
    const entry = {
      type: 'strength',
      label: 'Upper 1',
      date: '6/18',
      prs: 2,
      exercises: [
        { name: 'Bench', weight: '80kg', volume: '2400', e1rm: '95', pr: true },
      ],
    };
    render(<LogEntry entry={entry} />);
    expect(screen.getByText(/🏆 2/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Upper 1'));
    expect(screen.getByText('Exercise')).toBeInTheDocument();
    expect(screen.getByText(/Bench/)).toBeInTheDocument();
    expect(screen.getByText('80kg')).toBeInTheDocument();
  });

  it('renders a planned erg prescription', () => {
    const entry = {
      type: 'erg',
      _isErg: true,
      label: 'AT 4x4',
      date: '6/21',
      status: 'planned',
    };
    render(<LogEntry entry={entry} />);
    expect(screen.getByText('PLANNED')).toBeInTheDocument();

    fireEvent.click(screen.getByText('AT 4x4'));
    expect(screen.getByText(/Prescription/)).toBeInTheDocument();
  });

  it('AC12 renders a cancelled erg session as cancelled, not as a data gap', () => {
    const entry = {
      type: 'erg',
      _isErg: true,
      label: 'CP RETEST — 1min + 4min max (rested, fed)',
      date: '7/5/26',
      status: 'cancelled',
    };
    render(<LogEntry entry={entry} />);
    expect(screen.getByText('CANCELLED')).toBeInTheDocument();
    expect(screen.queryByText('PLANNED')).not.toBeInTheDocument();
    expect(screen.queryByText('✓ DONE')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/CP RETEST/));
    expect(screen.getByText(/was not completed/)).toBeInTheDocument();
    expect(
      screen.queryByText('No metrics logged for this session.')
    ).not.toBeInTheDocument();
  });

  it('AC12b renders a cancelled NON-erg session as cancelled, not as "Session · <duration>"', () => {
    // 21 of the 32 live cancelled rows are strength or cycling, all carrying a
    // duration and no exercises — they render through the !isErg fallback, a
    // different branch from AC12's. Unpatched it read "Session · 45min" under a
    // CANCELLED chip: an affirmative claim about a session that did not happen.
    const entry = {
      type: 'Lower Strength',
      label: 'Lower B — RDL-led',
      date: '7/13/26',
      duration: '45min',
      status: 'cancelled',
    };
    render(<LogEntry entry={entry} />);
    expect(screen.getByText('CANCELLED')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Lower B/));
    expect(screen.getByText(/was not completed/)).toBeInTheDocument();
    expect(screen.queryByText('Session · 45min')).not.toBeInTheDocument();
    expect(screen.queryByText('Session logged.')).not.toBeInTheDocument();
  });

  it('renders a non-erg session with no exercise table', () => {
    const entry = {
      type: 'bike',
      label: 'Z2 spin',
      date: '6/17',
      duration: '45min',
    };
    render(<LogEntry entry={entry} />);
    fireEvent.click(screen.getByText('Z2 spin'));
    expect(screen.getByText(/Session · 45min/)).toBeInTheDocument();
  });
});
