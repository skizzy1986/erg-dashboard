import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { THEME } from '../../constants/theme.js';
import { EVENT_LADDER } from '../../constants/schedule.js';

const useBenchmarkSessionsMock = vi.fn();

vi.mock('../../hooks/useBenchmarkSessions.js', () => ({
  useBenchmarkSessions: (...args) => useBenchmarkSessionsMock(...args),
}));

import BenchmarkStatusBanner from '../BenchmarkStatusBanner.jsx';

const SESSIONS = [
  {
    id: 45,
    date: '6/23/26',
    label: 'CP Test - 4min MAX (GATED)',
    status: 'completed',
  },
  {
    id: 61,
    date: '7/5/26',
    label: 'CP RETEST — 1min + 4min max (rested, fed)',
    status: 'cancelled',
  },
];

function renderView(props = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(BenchmarkStatusBanner, props)
    )
  );
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

const upcomingEntry = {
  date: '~Early Aug 26',
  name: 'Fixture Upcoming Test',
  kind: 'benchmark',
  windowStart: '2026-08-01',
  windowEnd: '2026-08-10',
  matchTerms: ['fixture'],
};

beforeEach(() => {
  useBenchmarkSessionsMock.mockReset();
  useBenchmarkSessionsMock.mockReturnValue({
    data: SESSIONS,
    isLoading: false,
    isError: false,
  });
});

describe('BenchmarkStatusBanner', () => {
  it('renders nothing while the sessions query is in flight, with no all-clear copy', () => {
    useBenchmarkSessionsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    const { container } = renderView({ today: new Date(2026, 7, 20) });
    expect(container.firstChild).toBeNull();
    expect(container.textContent).not.toMatch(/DONE/i);
    expect(container.textContent).not.toMatch(/UP TO DATE/i);
    expect(container.textContent).not.toMatch(/ALL CLEAR/i);
  });

  it('states the status is unavailable when the sessions query fails, with no signal row', () => {
    useBenchmarkSessionsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    const { container } = renderView({ today: new Date(2026, 7, 20) });
    expect(
      screen.getByText('BENCHMARK STATUS UNAVAILABLE')
    ).toBeInTheDocument();
    // A negative statement about the data — never an affirmative all-clear,
    // and never dressed as a signal.
    expect(container.textContent).not.toMatch(/OVERDUE/);
    expect(container.textContent).not.toMatch(/DUE IN/);
    expect(container.textContent).not.toContain('\u26a0');
    expect(container.textContent).not.toContain('\u25cf');
    expect(container.textContent).not.toMatch(/DONE/i);
    expect(container.textContent).not.toMatch(/UP TO DATE/i);
    expect(container.textContent).not.toMatch(/ALL CLEAR/i);
  });

  it('never shows the unavailable line while the query is still loading', () => {
    useBenchmarkSessionsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    const { container } = renderView({ today: new Date(2026, 7, 20) });
    expect(container.firstChild).toBeNull();
    expect(container.textContent).not.toContain('UNAVAILABLE');
  });

  it('keeps the unavailable line but drops the heading in compact mode', () => {
    useBenchmarkSessionsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    renderView({ today: new Date(2026, 7, 20), compact: true });
    expect(
      screen.getByText('BENCHMARK STATUS UNAVAILABLE')
    ).toBeInTheDocument();
    expect(screen.queryByText('BENCHMARKS')).not.toBeInTheDocument();
  });

  it('renders the unavailable line in the recessive muted token, never a signal colour', () => {
    useBenchmarkSessionsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    renderView({ today: new Date(2026, 7, 20) });
    const line = screen.getByText('BENCHMARK STATUS UNAVAILABLE');
    expect(line.style.color).toBe(rgb(THEME.muted));
    for (const signal of [THEME.orange, THEME.gold, THEME.red]) {
      expect(line.style.color).not.toBe(rgb(signal));
    }
  });

  it('renders nothing when no benchmark is due', () => {
    const { container } = renderView({
      entries: [upcomingEntry],
      today: new Date(2026, 0, 1),
    });
    expect(container.firstChild).toBeNull();
  });

  it('shows the three overdue benchmarks on 2026-08-20', () => {
    renderView({ today: new Date(2026, 7, 20) });
    expect(screen.getByText('BENCHMARKS')).toBeInTheDocument();
    expect(screen.getAllByText('⚠ OVERDUE').length).toBe(3);
    for (const name of [
      'CP Test #1 (4-min)',
      'CP Test #2 (2nd duration)',
      '5k Time Trial',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getByText(/was due 10 Aug · 10d ago/)).toBeInTheDocument();
  });

  it('never surfaces a competition, TARGET or optional entry', () => {
    const { container } = renderView({ today: new Date(2026, 7, 20) });
    const nonBenchmarks = EVENT_LADDER.filter((e) => e.kind !== 'benchmark');
    expect(nonBenchmarks.length).toBe(4);
    for (const e of nonBenchmarks) {
      expect(container.textContent).not.toContain(e.name);
    }
  });

  it('shows an upcoming benchmark with its countdown', () => {
    renderView({ entries: [upcomingEntry], today: new Date(2026, 6, 28) });
    expect(screen.getByText('● DUE IN 4d')).toBeInTheDocument();
    expect(screen.getByText('Fixture Upcoming Test')).toBeInTheDocument();
    expect(screen.queryByText('⚠ OVERDUE')).not.toBeInTheDocument();
  });

  it('distinguishes overdue from upcoming by colour, glyph and copy', () => {
    const overdueView = renderView({ today: new Date(2026, 7, 20) });
    const overdueBadge = overdueView.getAllByText('⚠ OVERDUE')[0];
    expect(overdueBadge.style.color).toBe(rgb(THEME.orange));

    const upcomingView = renderView({
      entries: [upcomingEntry],
      today: new Date(2026, 6, 28),
    });
    const upcomingBadge = upcomingView.getByText('● DUE IN 4d');
    expect(upcomingBadge.style.color).toBe(rgb(THEME.gold));
    expect(upcomingBadge.style.color).not.toBe(overdueBadge.style.color);
  });

  it('drops the section heading in compact mode', () => {
    const { container } = renderView({
      today: new Date(2026, 7, 20),
      compact: true,
    });
    expect(container.firstChild).not.toBeNull();
    expect(screen.queryByText('BENCHMARKS')).not.toBeInTheDocument();
    expect(screen.getAllByText('⚠ OVERDUE').length).toBe(3);
  });

  it('uses only THEME colours — no hard-coded literals in the inline styles', () => {
    const { container } = renderView({ today: new Date(2026, 7, 20) });
    const known = new Set(Object.values(THEME).map((v) => rgb(v.slice(0, 7))));
    const markup = container.innerHTML;

    // jsdom normalises every colour it understands to rgb()/rgba(), so any
    // surviving hex would be a value it could not parse at all.
    expect(markup).not.toMatch(/#[0-9a-f]{3,8}/i);

    const colours = markup.match(/rgba?\([^)]*\)/g) ?? [];
    expect(colours.length).toBeGreaterThan(0);
    for (const colour of colours) {
      const [r, g, b] = colour.match(/[\d.]+/g);
      expect(known, `${colour} is not a THEME token`).toContain(
        `rgb(${r}, ${g}, ${b})`
      );
    }
  });
});
