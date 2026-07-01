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
