import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import * as nutrition from '../../constants/nutrition.js';

// Targets, plans and the working MHR are live anchors. Synthetic values only.
const useAnchorsMock = vi.fn();
vi.mock('../../hooks/useAnchors.js', () => ({
  useAnchors: () => useAnchorsMock(),
}));

import ProgramView from '../ProgramView.jsx';

const emptyAnchors = {
  anchors: {},
  hrMax: null,
  maintenancePlan: null,
  deficitPlan: null,
};

beforeEach(() => {
  useAnchorsMock.mockReset();
  useAnchorsMock.mockReturnValue(emptyAnchors);
});

const renderView = () =>
  render(<ProgramView expanded={null} setExpanded={vi.fn()} />);

// ProgramView is ~1,900 lines and the default 'phases' tab mounts most of it
// synchronously, so every test here pays a full render. In isolation that is
// ~450 ms, but under parallel workers on a cold transform it has been observed
// at 5352 / 5895 / 6090 ms — over Vitest's 5000 ms default, which fails the
// pre-push hook and costs a ~2 min full-suite retry (#219). Nothing here
// awaits: it is render cost, not a race, so a longer budget cannot mask a hang.
// App.test.jsx already carries `}, 30000)` for the same reason.
// The real fix is #77's views/program/* decomposition shrinking the render.
describe('ProgramView', { timeout: 15000 }, () => {
  it('renders the sub-nav and the phases tab by default', () => {
    renderView();
    expect(screen.getByRole('button', { name: /phases/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /2-wk cycle/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /annual/i })).toBeInTheDocument();
    expect(document.body.textContent.length).toBeGreaterThan(500);
  });

  it('switches to the 2-week cycle sub-tab', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /2-wk cycle/i }));
    expect(
      screen.getByRole('button', { name: /2-wk cycle/i })
    ).toBeInTheDocument();
    expect(document.body.textContent.length).toBeGreaterThan(500);
  });

  it('switches to the annual sub-tab', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /annual/i }));
    expect(screen.getByRole('button', { name: /annual/i })).toBeInTheDocument();
    expect(document.body.textContent.length).toBeGreaterThan(500);
  });

  it('renders "—" bands and says the MHR anchor is unavailable when unset', () => {
    renderView();
    expect(screen.getByText('MHR anchor unavailable')).toBeInTheDocument();
    expect(screen.getByText(/80–87% of MHR/)).toBeInTheDocument();
    expect(screen.queryByText(/\d+–\d+ bpm/)).not.toBeInTheDocument();
  });

  it('derives the HR bands from the hr_max_working anchor (example MHR)', () => {
    useAnchorsMock.mockReturnValue({
      ...emptyAnchors,
      hrMax: 180,
      anchors: {
        hr_max_working: {
          key: 'hr_max_working',
          value: '180',
          unit: 'bpm',
          status: 'provisional',
        },
      },
    });
    renderView();
    expect(
      screen.getByText('Working MHR 180 bpm (provisional)')
    ).toBeInTheDocument();
    expect(screen.getByText('126–144 bpm')).toBeInTheDocument();
    expect(screen.getByText('< 126 bpm')).toBeInTheDocument();
    expect(screen.getByText('> 166 bpm')).toBeInTheDocument();
    expect(screen.getByText(/~144–157 bpm/)).toBeInTheDocument();
  });

  it('says each plan is not set on a fresh DB', () => {
    renderView();
    expect(screen.getAllByText('Plan not set in anchors')).toHaveLength(2);
    expect(screen.getByText(/Phase timing not set/)).toBeInTheDocument();
  });

  it('renders the maintenance and deficit plans from anchors', () => {
    useAnchorsMock.mockReturnValue({
      ...emptyAnchors,
      anchors: {
        protein_floor_g: {
          key: 'protein_floor_g',
          value: '150',
          unit: 'g',
          status: 'confirmed',
        },
        maintenance_plan: { key: 'maintenance_plan', status: 'provisional' },
      },
      maintenancePlan: {
        days: [
          { day: 'ExDayA', train: 'Example', cal: 2000, p: 150, c: 200, f: 60 },
        ],
      },
      deficitPlan: {
        trigger: 'Example trigger',
        rate: 'Example rate',
        phase: 'Example phase',
        days: [
          { day: 'ExDayB', cal: 1800, p: 150, c: 180, f: 55, cut: '-200' },
        ],
      },
    });
    renderView();
    expect(
      screen.queryByText('Plan not set in anchors')
    ).not.toBeInTheDocument();
    const a = screen.getByText('ExDayA').closest('tr');
    expect(within(a).getByText('2000')).toBeInTheDocument();
    const b = screen.getByText('ExDayB').closest('tr');
    expect(within(b).getByText('-200')).toBeInTheDocument();
    expect(screen.getByText(/Example trigger/)).toBeInTheDocument();
    expect(screen.getByText('Example rate')).toBeInTheDocument();
    expect(screen.getByText(/Example phase/)).toBeInTheDocument();
    expect(screen.getByText(/150 g \(confirmed\)/)).toBeInTheDocument();
  });

  it('renders the fat floor from the fat_floor_g anchor (synthetic value)', () => {
    useAnchorsMock.mockReturnValue({
      ...emptyAnchors,
      anchors: {
        fat_floor_g: {
          key: 'fat_floor_g',
          value: '60',
          unit: 'g',
          status: 'provisional',
        },
      },
    });
    renderView();
    const fat = nutrition.MACRO_TARGETS.find((m) => m.macro === 'Fat');
    const ruleEl = screen.getByText(fat.rule);
    expect(ruleEl.parentElement.textContent).toBe(
      `60 g (provisional) · ${fat.rule}`
    );
  });

  it('falls back to the rule alone when the floor anchors are absent', () => {
    renderView();
    for (const m of nutrition.MACRO_TARGETS) {
      const ruleEl = screen.getByText(m.rule);
      expect(ruleEl.parentElement.textContent).toBe(m.rule);
    }
  });

  it('keeps no personal plan or target constants', () => {
    for (const name of ['MF_PROGRAM', 'DEFICIT_PROGRAM', 'NUTRITION_TARGETS']) {
      expect(nutrition).not.toHaveProperty(name);
    }
    for (const m of nutrition.MACRO_TARGETS) {
      expect(m).not.toHaveProperty('target');
    }
  });
});
