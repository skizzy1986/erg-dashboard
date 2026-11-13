import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';

import CalendarView from '../CalendarView.jsx';

// Pinned so the 17-day window (today - 3 .. today + 13) crosses Dec → Jan.
// Local-argument constructor keeps it TZ-independent.
const NOW = [2031, 0, 2, 9];

// Unpadded M/D/YY for today + offset, built from the pinned local date so no
// fixture spells out a year. A padded key would match nothing and let every
// assertion pass vacuously.
function mdy(offsetDays) {
  const d = new Date(NOW[0], NOW[1], NOW[2] + offsetDays);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
}

function renderView(props = {}) {
  return render(<CalendarView isWide={false} {...props} />);
}

// The strip is the legend's next sibling; each child is one day cell, and each
// cell's first child is its header row. Index i is day `today - 3 + i`.
function stripCells(container) {
  const legend = within(container).getByText(/LAST 3 DAYS/).parentElement;
  return Array.from(legend.nextElementSibling.children);
}

const header = (container, offset) =>
  stripCells(container)[offset + 3].firstElementChild.textContent;

describe('CalendarView — sessions rows only (#420)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(...NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 17 empty cells and an empty-window line with zero sessions', () => {
    const { container } = renderView();
    const cells = stripCells(container);
    expect(cells).toHaveLength(17);
    expect(screen.getAllByText('—')).toHaveLength(17);
    expect(screen.getByText('No sessions in this window.')).toBeTruthy();
  });

  it('shows a loading line and no cells while loading', () => {
    renderView({ dbStatus: 'loading' });
    expect(screen.getByText('Loading sessions…')).toBeTruthy();
    expect(screen.queryAllByText('—')).toHaveLength(0);
    expect(screen.queryByText('No sessions in this window.')).toBeNull();
  });

  it('shows an error line and no cells when the load failed', () => {
    renderView({ dbStatus: 'error' });
    expect(screen.getByText('Sessions could not be loaded.')).toBeTruthy();
    expect(screen.queryAllByText('—')).toHaveLength(0);
    expect(screen.queryByText('No sessions in this window.')).toBeNull();
  });

  it('marks a completed row today as done and shows its label', () => {
    const { container } = renderView({
      loggedSessions: [{ date: mdy(0), label: 'UT2 60min' }],
    });
    expect(header(container, 0)).toBe('✓ DONE');
    expect(screen.getByText('UT2 60min')).toBeTruthy();
    expect(screen.getByText('● TODAY')).toBeTruthy();
    expect(screen.queryByText('No sessions in this window.')).toBeNull();
  });

  it('counts two completed rows on one day as ×2', () => {
    const { container } = renderView({
      loggedSessions: [
        { date: mdy(-1), label: 'Lower A' },
        { date: mdy(-1), label: 'Warm-down paddle' },
      ],
    });
    expect(header(container, -1)).toBe('✓ DONE ×2');
    expect(stripCells(container)[2].style.opacity).toBe('0.85');
  });

  it('marks a future planned row PLANNED with no tick', () => {
    const { container } = renderView({
      plannedSessions: [{ date: mdy(5), label: 'UT1 50min steady' }],
    });
    expect(header(container, 5)).toBe('PLANNED');
    const cell = stripCells(container)[8];
    expect(within(cell).getByText('UT1 50min steady')).toBeTruthy();
    expect(within(cell).queryByText('✓')).toBeNull();
    expect(cell.style.opacity).toBe('1');
  });

  it('keeps a past planned row PLANNED and never calls it missed', () => {
    const { container } = renderView({
      plannedSessions: [{ date: mdy(-2), label: 'Upper A' }],
    });
    expect(header(container, -2)).toBe('PLANNED');
    expect(screen.queryByText(/not logged|missed/i)).toBeNull();
    expect(container.textContent).not.toMatch(/not logged|missed/i);
  });

  it('marks a cancelled row without counting it as done', () => {
    const { container } = renderView({
      cancelledSessions: [{ date: mdy(1), label: 'Bike Z2' }],
    });
    const h = header(container, 1);
    expect(h).toContain('⊘ 1 CANCELLED');
    expect(h).not.toContain('✓ DONE');
    expect(screen.getByText('⊘ Bike Z2')).toBeTruthy();
  });

  it('does not render a row outside the window', () => {
    renderView({
      loggedSessions: [
        { date: mdy(-4), label: 'Too early' },
        { date: mdy(14), label: 'Too late' },
      ],
    });
    expect(screen.queryByText('Too early')).toBeNull();
    expect(screen.queryByText('Too late')).toBeNull();
    expect(screen.getByText('No sessions in this window.')).toBeTruthy();
  });

  it('expands a completed row to show its coach note', () => {
    renderView({
      loggedSessions: [
        { date: mdy(-1), label: 'CP test', coachNote: 'Rested, PB pace' },
      ],
    });
    expect(screen.queryByText(/Rested, PB pace/)).toBeNull();
    fireEvent.click(screen.getByText('CP test'));
    expect(screen.getByText(/Rested, PB pace/)).toBeTruthy();
  });

  it('orders completed, then planned, then cancelled within a day', () => {
    const { container } = renderView({
      loggedSessions: [{ date: mdy(0), label: 'Done one' }],
      plannedSessions: [{ date: mdy(0), label: 'Plan one' }],
      cancelledSessions: [{ date: mdy(0), label: 'Gone one' }],
    });
    const text = stripCells(container)[3].textContent;
    expect(text.indexOf('Done one')).toBeLessThan(text.indexOf('Plan one'));
    expect(text.indexOf('Plan one')).toBeLessThan(text.indexOf('⊘ Gone one'));
  });

  it('carries no roster banner or swap marker', () => {
    const { container } = renderView({
      loggedSessions: [{ date: mdy(0), label: 'UT2' }],
    });
    expect(container.textContent).not.toMatch(/YOUR\sWEEKS|SWAPPED|FIFO/);
  });

  it('rails show Dec and Jan across the year boundary', () => {
    const { container } = renderView();
    const cells = stripCells(container);
    expect(cells[0].textContent).toContain('Dec');
    expect(cells[0].textContent).toContain('30');
    expect(cells[3].textContent).toContain('Jan');
    expect(cells[16].textContent).toContain('Jan');
  });
});
