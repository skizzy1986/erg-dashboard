import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../hooks/useBenchmarkSessions.js', () => ({
  useBenchmarkSessions: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
}));

import CalendarView from '../CalendarView.jsx';

function renderView() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(CalendarView, { loggedSessions: [], isWide: false })
    )
  );
}

describe('CalendarView', () => {
  it('renders the week strip header and the upcoming events ladder', () => {
    renderView();
    expect(screen.getByText(/YOUR WEEKS/i)).toBeInTheDocument();
    expect(
      screen.getByText(/UPCOMING EVENTS · SEASON 1 LADDER/i)
    ).toBeInTheDocument();
  });

  it('renders the benchmark banner above the ladder heading', () => {
    const { container } = renderView();
    const banner = screen.getByText('BENCHMARKS');
    const ladder = screen.getByText(/UPCOMING EVENTS · SEASON 1 LADDER/i);
    // querySelectorAll returns document order.
    const inOrder = [...container.querySelectorAll('div')];
    expect(inOrder).toContain(banner);
    expect(inOrder.indexOf(banner)).toBeLessThan(inOrder.indexOf(ladder));
  });
});
