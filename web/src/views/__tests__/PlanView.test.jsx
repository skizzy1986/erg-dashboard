import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlanView from '../PlanView.jsx';

describe('PlanView', () => {
  it('shows the empty state when there are no upcoming planned sessions', () => {
    render(
      <PlanView plannedSessions={[]} loggedKeys={new Set()} isWide={false} />
    );
    expect(screen.getByText(/THE PLAN/i)).toBeInTheDocument();
    expect(
      screen.getByText('No upcoming planned sessions.')
    ).toBeInTheDocument();
  });

  it('renders upcoming planned sessions sorted by date, filtering out past ones', () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const futureKey = `${future.getMonth() + 1}/${future.getDate()}/${String(future.getFullYear()).slice(-2)}`;

    const plannedSessions = [
      {
        date: '1/1/20',
        type: 'erg',
        label: 'Old Planned Row',
        status: 'planned',
      },
      { date: futureKey, type: 'erg', label: 'UT2 60min', status: 'planned' },
    ];

    render(
      <PlanView
        plannedSessions={plannedSessions}
        loggedKeys={new Set()}
        isWide={true}
      />
    );
    expect(screen.getByText(/UT2 60min/i)).toBeInTheDocument();
    expect(screen.queryByText(/Old Planned Row/i)).not.toBeInTheDocument();
  });
});
