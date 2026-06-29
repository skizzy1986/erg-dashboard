import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ErgTooltip from '../ErgTooltip.jsx';

const payload = [
  {
    payload: {
      date: '6/13',
      dist: '60m',
      watts: 150,
      pace: 132.5,
      hardPush: false,
    },
  },
];

describe('ErgTooltip', () => {
  it('returns null when inactive', () => {
    const { container } = render(<ErgTooltip active={false} payload={[]} />);
    expect(container.firstChild).toBe(null);
  });

  it('returns null with empty payload', () => {
    const { container } = render(<ErgTooltip active payload={[]} />);
    expect(container.firstChild).toBe(null);
  });

  it('renders Z2 watts and pace when active', () => {
    const { getByText } = render(<ErgTooltip active payload={payload} />);
    expect(getByText(/150W/)).toBeTruthy();
    expect(getByText(/2:12.5\/500m · Z2/)).toBeTruthy();
  });

  it('shows hard push label when flagged', () => {
    const hp = [{ payload: { ...payload[0].payload, hardPush: true } }];
    const { getByText } = render(<ErgTooltip active payload={hp} />);
    expect(getByText(/hard push/)).toBeTruthy();
  });
});
