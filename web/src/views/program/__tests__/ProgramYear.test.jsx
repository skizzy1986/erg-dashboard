import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgramYear from '../ProgramYear.jsx';
import { EVENT_LADDER } from '../../../constants/schedule.js';

describe('ProgramYear', () => {
  it('renders the season target and annual arc', () => {
    render(<ProgramYear />);
    expect(screen.getByText(/SEASON TARGET/i)).toBeInTheDocument();
    expect(screen.getByText(/ANNUAL ARC:/i)).toBeInTheDocument();
  });

  it('renders the event pathway and organisations sections', () => {
    render(<ProgramYear />);
    expect(
      screen.getByText(/EVENT PATHWAY · HOME ERG → INTERNATIONAL/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/ORGANISATIONS TO FOLLOW/i)).toBeInTheDocument();
  });

  // AC8. The season timeline is static reference content: it renders the whole
  // ladder, including the four entries the Calendar panel never shows, and it
  // reads only date/name/kind/serves. Adding `key` to five entries and a link
  // control to the Calendar must not leak a badge or an affordance in here.
  it('renders all nine ladder entries with no badge and no link control', () => {
    render(<ProgramYear />);

    expect(EVENT_LADDER).toHaveLength(9);
    // getAllBy: a couple of ladder names also appear in the pathway section
    // above, which is exactly the static-reference duplication AC8 protects.
    for (const e of EVENT_LADDER) {
      expect(screen.getAllByText(e.name).length).toBeGreaterThan(0);
    }

    expect(screen.queryByText(/OVERDUE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^DUE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^LINK/)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
