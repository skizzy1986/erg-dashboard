import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadTooltip from '../LoadTooltip.jsx';

const point = (over = {}) => ({
  date: '6/20',
  ctl: 60,
  atl: 65,
  tsb: -5,
  tss: 50,
  ...over,
});
const tip = (over) => (
  <LoadTooltip active payload={[{ payload: point(over) }]} />
);

describe('LoadTooltip', () => {
  it('renders nothing when inactive or payload is empty', () => {
    const { container, rerender } = render(
      <LoadTooltip active={false} payload={[]} />
    );
    expect(container.firstChild).toBeNull();
    rerender(<LoadTooltip active payload={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders CTL/ATL/TSB, a note, a positive-TSB sign, and TSS', () => {
    render(tip({ note: 'deload', tsb: 5 }));
    expect(screen.getByText(/deload/)).toBeInTheDocument();
    expect(screen.getByText('CTL')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument(); // ctl
    expect(screen.getByText(/\+5/)).toBeInTheDocument(); // tsb > 0 → '+'
    expect(screen.getByText('50')).toBeInTheDocument(); // tss
  });

  it('covers every TSB colour band and hides the TSS row when zero', () => {
    const { container, rerender } = render(tip({ tsb: 20, tss: 0 }));
    expect(container.textContent).not.toMatch(/TSS/); // tss 0 → row hidden
    rerender(tip({ tsb: 0 })); // > -10 band
    rerender(tip({ tsb: -20 })); // > -30 band
    rerender(tip({ tsb: -40 })); // else band
    expect(container.textContent).toMatch(/TSB/);
  });
});
