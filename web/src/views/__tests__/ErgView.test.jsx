import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const useErgSessionsMock = vi.fn();
const useAnchorsMock = vi.fn();

vi.mock('../../hooks/useErgSessions.js', () => ({
  useErgSessions: (...args) => useErgSessionsMock(...args),
}));

vi.mock('../../hooks/useAnchors.js', () => ({
  useAnchors: (...args) => useAnchorsMock(...args),
}));

import ErgView from '../ErgView.jsx';

function renderView() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(ErgView, { tsbNow: 5, ctlNow: 50 })
    )
  );
}

beforeEach(() => {
  useErgSessionsMock.mockReset();
  useAnchorsMock.mockReset();
  useAnchorsMock.mockReturnValue({
    cp: 205,
    cpStatus: 'provisional',
    cpAvailable: true,
  });
});

describe('ErgView', () => {
  it('renders without crashing with empty data', () => {
    useErgSessionsMock.mockReturnValue({ data: [], isLoading: false });
    const { container } = renderView();
    expect(container).toBeTruthy();
  });

  function mkSession(i, watts, zone) {
    return {
      id: i,
      date: '2026-06-13',
      label: `session ${i}`,
      duration: 45,
      srpe: i % 2 === 0 ? 8 : 4,
      avg_watts: watts,
      avg_hr: 130,
      distance_m: 10000,
      pace_500m: 130 + i,
      pace_500m_str: `2:1${i}.0`,
      zone,
      hardPush: i % 2 === 0,
      date_display: `6/1${i}`,
    };
  }

  it('renders the pace improvement summary and zone bars with 6+ sessions', () => {
    useErgSessionsMock.mockReturnValue({
      data: [
        mkSession(1, 150, 'UT1'),
        mkSession(2, 120, 'UT2'),
        mkSession(3, 165, 'AT'),
        mkSession(4, 190, 'TR'),
        mkSession(5, 220, 'AN'),
        mkSession(6, 130, 'UT2'),
        mkSession(7, 145, 'UT1'),
      ],
      isLoading: false,
    });
    const { container } = renderView();
    expect(container).toBeTruthy();
  });

  it('renders with a negative TSB (red form branch)', () => {
    useErgSessionsMock.mockReturnValue({ data: [], isLoading: false });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { container } = render(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(ErgView, { tsbNow: -20, ctlNow: 40 })
      )
    );
    expect(container).toBeTruthy();
  });

  it('renders with a null TSB', () => {
    useErgSessionsMock.mockReturnValue({ data: undefined, isLoading: true });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { container } = render(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(ErgView, { tsbNow: null, ctlNow: null })
      )
    );
    expect(container).toBeTruthy();
  });

  it('shows the live CP value and status from anchors', () => {
    useErgSessionsMock.mockReturnValue({ data: [], isLoading: false });
    const { container } = renderView();
    expect(container.textContent).toContain('205W');
    expect(container.textContent).toContain('provisional');
  });

  it('shows "CP unavailable" when the anchor is missing (no stale 190)', () => {
    useErgSessionsMock.mockReturnValue({ data: [], isLoading: false });
    useAnchorsMock.mockReturnValue({
      cp: null,
      cpStatus: null,
      cpAvailable: false,
    });
    const { container } = renderView();
    // The CP card degrades explicitly instead of showing a resolved wattage.
    expect(container.textContent).toContain('CP unavailable');
    expect(container.textContent).toContain('anchor unreachable');
  });

  it('renders without crashing with a session', () => {
    useErgSessionsMock.mockReturnValue({
      data: [
        {
          id: 1,
          date: '2026-06-13',
          label: '60min UT1',
          duration: 60,
          srpe: 6,
          avg_watts: 150,
          avg_hr: 130,
          distance_m: 13500,
          pace_500m: 132.6,
          pace_500m_str: '2:12.6',
          zone: 'UT1',
          hardPush: false,
          date_display: '6/13',
        },
      ],
      isLoading: false,
    });
    const { container } = renderView();
    expect(container).toBeTruthy();
  });

  // withinLast7Days used to build a Date from the raw string, which is Invalid
  // Date for the live "M/D/YY" format — so this counter always read 0.
  it('counts a recent M/D/YY session in SESSIONS / WK', () => {
    const d = new Date(Date.now() - 2 * 86400000);
    const mdy = `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
    useErgSessionsMock.mockReturnValue({
      data: [
        {
          id: 1,
          date: mdy,
          label: '60min UT1',
          duration: 60,
          srpe: 6,
          avg_watts: 150,
          avg_hr: 130,
          distance_m: 13500,
          pace_500m: 132.6,
          pace_500m_str: '2:12.6',
          zone: 'UT1',
          hardPush: false,
          date_display: '8/18',
        },
      ],
      isLoading: false,
    });
    const { getByText } = renderView();
    expect(getByText('SESSIONS / WK').nextSibling.textContent).toBe('1');
  });

  it('does not count a session older than 7 days in SESSIONS / WK', () => {
    useErgSessionsMock.mockReturnValue({
      data: [
        {
          id: 1,
          date: '1/2/26',
          label: 'old row',
          duration: 60,
          avg_watts: 150,
          pace_500m: 132.6,
          pace_500m_str: '2:12.6',
          zone: 'UT1',
          hardPush: false,
          date_display: '1/2',
        },
      ],
      isLoading: false,
    });
    const { getByText } = renderView();
    expect(getByText('SESSIONS / WK').nextSibling.textContent).toBe('0');
  });

  describe('CP display tracks the live anchor', () => {
    beforeEach(() => {
      useErgSessionsMock.mockReturnValue({ data: [], isLoading: false });
    });

    it('shows the live CP and its status on the CP card', () => {
      const { getByText } = renderView();
      const card = getByText('CRITICAL POWER').parentElement;
      expect(card.textContent).toContain('205W');
      expect(card.textContent).toContain('provisional');
    });

    it('never presents 190W as the current CP', () => {
      const { container } = renderView();
      expect(container.textContent).not.toContain('190W');
    });

    it('follows the anchor when it changes rather than staying pinned', () => {
      useAnchorsMock.mockReturnValue({
        cp: 212,
        cpStatus: 'confirmed',
        cpAvailable: true,
      });
      const { getByText } = renderView();
      const card = getByText('CRITICAL POWER').parentElement;
      expect(card.textContent).toContain('212W');
      expect(card.textContent).toContain('confirmed');
    });

    it('says the anchor is unavailable instead of falling back silently', () => {
      useAnchorsMock.mockReturnValue({
        cp: null,
        cpStatus: null,
        cpAvailable: false,
      });
      const { getByText } = renderView();
      const card = getByText('CRITICAL POWER').parentElement;
      expect(card.textContent).toContain('CP unavailable');
      expect(card.textContent).toContain('anchor unreachable');
      expect(card.textContent).not.toMatch(/\d+W/);
    });

    it('does not show a past-dated CP test window', () => {
      const { container } = renderView();
      expect(container.textContent).not.toContain('~Jun 24+');
    });
  });

  describe('trends derive from logged sessions (#422)', () => {
    const POWER_GAP = 'sessions with power logged';
    const EFF_GAP = 'sessions with power and heart rate';

    function powered(n, { hr = null } = {}) {
      return Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        date: `11/${10 - i}/26`,
        label: `row ${i + 1}`,
        duration: 45,
        srpe: 4,
        avg_watts: 140 + i,
        avg_hr: hr,
        pace_500m: 130,
        pace_500m_str: '2:10.0',
        zone: 'UT2',
        hardPush: false,
        date_display: `11/${10 - i}`,
      }));
    }

    it('shows insufficient data in both trend sections with no sessions', () => {
      useErgSessionsMock.mockReturnValue({ data: [], isLoading: false });
      const { container } = renderView();
      const text = container.textContent;
      expect(text.match(/insufficient data/gi)).toHaveLength(2);
      expect(text).toContain(`0 of 3 ${POWER_GAP}`);
      expect(text).toContain(`0 of 3 ${EFF_GAP}`);
    });

    it('shows insufficient data in both trend sections with two powered sessions', () => {
      useErgSessionsMock.mockReturnValue({
        data: powered(2, { hr: 125 }),
        isLoading: false,
      });
      const { container } = renderView();
      const text = container.textContent;
      expect(text.match(/insufficient data/gi)).toHaveLength(2);
      expect(text).toContain(`2 of 3 ${POWER_GAP}`);
      expect(text).toContain(`2 of 3 ${EFF_GAP}`);
    });

    it('charts power from three sessions while efficiency still needs heart rate', () => {
      useErgSessionsMock.mockReturnValue({
        data: powered(3),
        isLoading: false,
      });
      const { container, getByText } = renderView();
      const text = container.textContent;
      expect(text).not.toContain(POWER_GAP);
      expect(text).toContain(`0 of 3 ${EFF_GAP}`);
      expect(text.match(/insufficient data/gi)).toHaveLength(1);
      expect(getByText('W / BPM').nextSibling.textContent).toBe('—');
    });

    it('fills the W / BPM tile and the efficiency stats from three sessions with heart rate', () => {
      useErgSessionsMock.mockReturnValue({
        data: powered(3, { hr: 100 }),
        isLoading: false,
      });
      const { container, getByText } = renderView();
      expect(container.textContent).not.toMatch(/insufficient data/i);
      // Newest row is 11/10 at 140 W / 100 bpm.
      expect(getByText('W / BPM').nextSibling.textContent).toBe('1.40');
      expect(getByText('LATEST').nextSibling.textContent).toBe('1.40');
      // Watts fall 0.01 W/bpm per day going forward in time → −0.07 /wk.
      expect(getByText('TREND').nextSibling.textContent).toBe('−0.07 /wk');
      expect(getByText('FIT').nextSibling.textContent).toBe('r² 1.00');
      expect(getByText('n 3')).toBeTruthy();
    });

    it('labels a rising efficiency trend with a plus sign', () => {
      const rows = powered(3, { hr: 100 }).map((r, i) => ({
        ...r,
        avg_watts: 150 - i,
      }));
      useErgSessionsMock.mockReturnValue({ data: rows, isLoading: false });
      const { getByText } = renderView();
      expect(getByText('TREND').nextSibling.textContent).toBe('+0.07 /wk');
    });

    it('widens the zone distribution from 30 sessions to all of them', () => {
      useErgSessionsMock.mockReturnValue({
        data: Array.from({ length: 31 }, (_, i) => ({
          ...powered(1)[0],
          id: i + 1,
          label: `row ${i + 1}`,
        })),
        isLoading: false,
      });
      const { container, getByText } = renderView();
      expect(container.textContent).toContain('UT2 30 · 100%');
      fireEvent.click(getByText('All'));
      expect(container.textContent).toContain('UT2 31 · 100%');
    });

    it('renders none of the removed personal-calibration surfaces', () => {
      useErgSessionsMock.mockReturnValue({
        data: powered(3, { hr: 100 }),
        isLoading: false,
      });
      const { container } = renderView();
      for (const gone of [
        'HR130',
        'KEY BAROMETER',
        'MODEL CALIBRATION STATUS',
        'RACE FORMATS',
        'PROJECTED',
        'NORTH STAR',
      ]) {
        expect(container.textContent).not.toContain(gone);
      }
    });
  });
});
