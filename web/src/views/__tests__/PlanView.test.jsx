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
      screen.getByText(/No upcoming planned sessions/i)
    ).toBeInTheDocument();
  });

  it('lists future planned sessions and hides the empty state', () => {
    const plannedSessions = [
      // Far-future date so it always sorts after "today".
      { type: 'erg', label: 'UT2 60min', date: '12/31/99', status: 'planned' },
    ];
    render(
      <PlanView
        plannedSessions={plannedSessions}
        loggedKeys={new Set()}
        isWide={true}
      />
    );
    expect(screen.getByText(/THE PLAN/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/No upcoming planned sessions/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText('UT2 60min')).toBeInTheDocument();
  });

  it('AC10 does not mark a planned session done when only a cancelled row exists', () => {
    // The hook's loggedKeys is built from the COUNTED set, so a cancelled
    // session contributes no key — the prescription stays outstanding.
    const plannedSessions = [
      { type: 'erg', label: 'UT2 60min', date: '12/31/99', status: 'planned' },
    ];
    const { unmount } = render(
      <PlanView
        plannedSessions={plannedSessions}
        loggedKeys={new Set()}
        isWide={false}
      />
    );
    expect(screen.queryByText('✓ DONE')).not.toBeInTheDocument();
    unmount();

    // Contrast case — with the key present the card marks done.
    render(
      <PlanView
        plannedSessions={plannedSessions}
        loggedKeys={new Set(['12/31/99|erg'])}
        isWide={false}
      />
    );
    expect(screen.getByText('✓ DONE')).toBeInTheDocument();
  });
});
