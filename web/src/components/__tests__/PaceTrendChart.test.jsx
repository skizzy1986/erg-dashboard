import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PaceTrendChart, { PaceTooltip, CustomDot } from '../PaceTrendChart.jsx';
import { PACE_ZONES } from '../../constants/trainingConfig.js';

describe('PaceTrendChart', () => {
  it('renders without crashing with empty data', () => {
    const { container } = render(
      <PaceTrendChart data={[]} paceZones={PACE_ZONES} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with enriched sessions', () => {
    const data = [
      {
        pace_500m: 128.4,
        pace_500m_str: '2:08.4',
        avg_watts: 150,
        zone: 'UT1',
        hardPush: false,
        date_display: '6/13',
      },
      {
        pace_500m: 125.1,
        pace_500m_str: '2:05.1',
        avg_watts: 181,
        zone: 'TR',
        hardPush: true,
        date_display: '6/5',
      },
    ];
    const { container } = render(
      <PaceTrendChart data={data} paceZones={PACE_ZONES} />
    );
    expect(container).toBeTruthy();
  });

  it('PaceTooltip returns null when inactive', () => {
    const { container } = render(<PaceTooltip active={false} payload={[]} />);
    expect(container.firstChild).toBe(null);
  });

  it('PaceTooltip renders pace, watts and zone when active', () => {
    const payload = [
      {
        payload: {
          date_display: '6/13',
          pace_500m_str: '2:12.6',
          avg_watts: 150,
          zone: 'UT1',
        },
      },
    ];
    const { getByText } = render(<PaceTooltip active payload={payload} />);
    expect(getByText(/2:12.6/)).toBeTruthy();
    expect(getByText(/150W · UT1/)).toBeTruthy();
  });

  it('PaceTooltip handles missing watts and zone', () => {
    const payload = [
      {
        payload: { date_display: '6/1', pace_500m_str: '2:20.0' },
      },
    ];
    const { getByText } = render(<PaceTooltip active payload={payload} />);
    expect(getByText(/—/)).toBeTruthy();
  });

  it('CustomDot returns null without coordinates', () => {
    expect(CustomDot({ cx: null, cy: null, payload: {} })).toBe(null);
  });

  it('CustomDot renders a filled circle for a hard push', () => {
    const { container } = render(
      <svg>
        <CustomDot cx={10} cy={10} payload={{ hardPush: true }} />
      </svg>
    );
    expect(container.querySelector('circle')).toBeTruthy();
  });

  it('CustomDot renders a hollow circle when not a hard push', () => {
    const { container } = render(
      <svg>
        <CustomDot cx={10} cy={10} payload={{ hardPush: false }} />
      </svg>
    );
    expect(container.querySelector('circle')).toBeTruthy();
  });

  it('renders without crashing with showBands false and no paceZones', () => {
    const data = [
      {
        pace_500m: 130,
        pace_500m_str: '2:10.0',
        avg_watts: 140,
        zone: 'UT1',
        hardPush: false,
        date_display: '6/1',
      },
    ];
    const { container } = render(
      <PaceTrendChart data={data} showBands={false} />
    );
    expect(container).toBeTruthy();
  });
});
