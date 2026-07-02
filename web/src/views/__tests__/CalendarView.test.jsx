import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CalendarView from '../CalendarView.jsx';

describe('CalendarView', () => {
  it('renders the roster window and the upcoming events ladder', () => {
    render(<CalendarView loggedSessions={[]} isWide={false} />);
    expect(screen.getByText(/YOUR WEEKS/i)).toBeInTheDocument();
    expect(
      screen.getByText(/UPCOMING EVENTS · SEASON 1 LADDER/i)
    ).toBeInTheDocument();
    expect(screen.getByText('CP Test #1 (4-min)')).toBeInTheDocument();
  });

  it('renders in wide layout with logged sessions supplied', () => {
    const loggedSessions = [
      { date: '6/30/26', type: 'erg', label: 'UT2 60min', status: null },
    ];
    render(<CalendarView loggedSessions={loggedSessions} isWide={true} />);
    expect(screen.getByText(/YOUR WEEKS/i)).toBeInTheDocument();
  });
});
