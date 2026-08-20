import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BenchmarkBadge from '../BenchmarkBadge.jsx';

describe('BenchmarkBadge', () => {
  it('renders nothing for quiet and unknown', () => {
    const { container, rerender } = render(<BenchmarkBadge status="quiet" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<BenchmarkBadge status="unknown" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<BenchmarkBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders OVERDUE with the elapsed day count', () => {
    render(<BenchmarkBadge status="overdue" daysOverdue={31} />);
    expect(screen.getByText('OVERDUE · 31d')).toBeInTheDocument();
  });

  it('omits the day count when it is not a positive number', () => {
    const { rerender } = render(<BenchmarkBadge status="overdue" />);
    expect(screen.getByText('OVERDUE')).toBeInTheDocument();
    rerender(<BenchmarkBadge status="overdue" daysOverdue={0} />);
    expect(screen.getByText('OVERDUE')).toBeInTheDocument();
  });

  it('renders DUE with the countdown when the window is ahead', () => {
    render(<BenchmarkBadge status="upcoming" daysUntilStart={5} />);
    expect(screen.getByText('DUE · 5d')).toBeInTheDocument();
  });

  it('renders NOW once the window has opened', () => {
    render(<BenchmarkBadge status="upcoming" daysUntilStart={-2} />);
    expect(screen.getByText('DUE · NOW')).toBeInTheDocument();
  });

  // AC2d
  it('qualifies a fuzzy upcoming window with "exact date TBD"', () => {
    render(<BenchmarkBadge status="upcoming" daysUntilStart={5} fuzzy />);
    expect(screen.getByText('DUE · 5d · exact date TBD')).toBeInTheDocument();
  });

  it('does not qualify an exact upcoming window', () => {
    render(<BenchmarkBadge status="upcoming" daysUntilStart={5} />);
    expect(screen.queryByText(/exact date TBD/)).not.toBeInTheDocument();
  });

  it('colours overdue red and upcoming gold', () => {
    const { container, rerender } = render(
      <BenchmarkBadge status="overdue" daysOverdue={3} />
    );
    expect(container.firstChild).toHaveStyle({ color: '#ff2d55' });
    rerender(<BenchmarkBadge status="upcoming" daysUntilStart={3} />);
    expect(container.firstChild).toHaveStyle({ color: '#ffd700' });
  });
});
