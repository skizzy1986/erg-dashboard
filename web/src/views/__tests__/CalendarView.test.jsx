import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CalendarView from '../CalendarView.jsx';

describe('CalendarView', () => {
  it('renders the week strip header and the upcoming events ladder', () => {
    render(<CalendarView loggedSessions={[]} isWide={false} />);
    expect(screen.getByText(/YOUR WEEKS/i)).toBeInTheDocument();
    expect(
      screen.getByText(/UPCOMING EVENTS · SEASON 1 LADDER/i)
    ).toBeInTheDocument();
  });
});
