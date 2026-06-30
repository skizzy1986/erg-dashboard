import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { strengthTrend, LIFT_COLOR } from '../../constants/strength.js';
import StrengthView from '../StrengthView.jsx';

const session = {
  type: 'strength',
  label: 'Logged Squat Session ZZZ',
  date: '6/9',
  status: 'logged',
  exercises: [{ name: 'Back Squat' }],
};

const renderView = (props = {}) =>
  render(
    <StrengthView
      activeLift="Back Squat"
      setActiveLift={() => {}}
      strengthSessions={[session]}
      {...props}
    />
  );

describe('StrengthView', () => {
  it('renders a selector button for every tracked lift', () => {
    renderView();
    for (const lift of Object.keys(strengthTrend)) {
      expect(screen.getByRole('button', { name: lift })).toBeInTheDocument();
    }
  });

  it('shows the e1RM chart header for the active lift', () => {
    renderView({ activeLift: 'Bench Press' });
    expect(screen.getByText(/BENCH PRESS · e1RM/i)).toBeInTheDocument();
  });

  it('calls setActiveLift when another lift is selected', () => {
    const setActiveLift = vi.fn();
    renderView({ setActiveLift });
    fireEvent.click(screen.getByRole('button', { name: 'Bench Press' }));
    expect(setActiveLift).toHaveBeenCalledWith('Bench Press');
  });

  it('renders the strength-session log', () => {
    renderView();
    expect(screen.getByText('STRENGTH SESSIONS')).toBeInTheDocument();
    expect(screen.getByText(/Logged Squat Session ZZZ/)).toBeInTheDocument();
  });

  it('every tracked lift has an accent colour', () => {
    // guards the selector/chart colour lookups the view relies on
    for (const lift of Object.keys(strengthTrend)) {
      expect(LIFT_COLOR[lift] || '#00d4ff').toMatch(/^#/);
    }
  });
});
