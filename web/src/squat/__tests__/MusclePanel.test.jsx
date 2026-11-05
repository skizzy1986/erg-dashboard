import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MuscleList from '../components/MuscleList.jsx';
import MuscleCard from '../components/MuscleCard.jsx';
import HeatmapLegend from '../components/HeatmapLegend.jsx';
import ViewOptions from '../components/ViewOptions.jsx';
import {
  ACT_BASIS,
  ACT_BANDS,
  ACT_NONE,
  ACT_NOTE,
  HEAT_LEGEND,
} from '../constants/activationBands.js';
import { buildMuscleIndex, filterMuscles } from '../utils/muscleIndex.js';
import { bandOf, peakBandOf } from '../utils/activation.js';

const manifest = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/squat/assets/squat-manifest.json'),
    'utf8'
  )
);
const MUSCLES = manifest.meta.muscles;
const index = buildMuscleIndex(MUSCLES);

function List(props = {}) {
  const query = props.query ?? '';
  const { regions, matches } = filterMuscles(index, query);
  return (
    <MuscleList
      regions={regions}
      total={index.all.length}
      matches={matches}
      query={query}
      onQuery={props.onQuery ?? (() => {})}
      selected={props.selected ?? null}
      onSelect={props.onSelect ?? (() => {})}
      notice={props.notice}
    />
  );
}

const listbox = () => screen.getByRole('listbox');
const options = () => screen.getAllByRole('option');

describe('MuscleList — structure', () => {
  it('is ONE tab stop holding all 118 options in eleven named groups', () => {
    render(<List />);
    expect(options()).toHaveLength(118);
    const groups = within(listbox()).getAllByRole('group');
    expect(groups).toHaveLength(11);
    for (const g of groups) {
      expect(g).toHaveAccessibleName();
      expect(within(g).getAllByRole('option').length).toBeGreaterThan(0);
    }
    // Roving tabindex: exactly one option is tabbable, the rest are -1.
    const tabbable = options().filter((o) => o.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(options().filter((o) => o.tabIndex === -1)).toHaveLength(117);
  });

  it('names the groups hips-first, not alphabetically', () => {
    render(<List />);
    const names = within(listbox())
      .getAllByRole('group')
      .map((g) => g.getAttribute('aria-label'));
    expect(names[0]).toBe('Hip extensors');
    expect(names.at(-1)).toBe('Grip and forearm');
    expect(names).not.toEqual([...names].sort());
  });

  it('lists the two tendons, because the list substitutes for the model', () => {
    render(<List />);
    for (const n of ['Iliotibial tract', 'Achilles (calcaneal) tendon']) {
      expect(screen.getByRole('option', { name: n })).toBeInTheDocument();
    }
  });

  it('marks selection with aria-selected, on every option', () => {
    render(<List selected="soleus" />);
    const sel = screen.getByRole('option', { name: 'Soleus' });
    expect(sel).toHaveAttribute('aria-selected', 'true');
    expect(
      options().filter((o) => o.getAttribute('aria-selected') === 'true')
    ).toHaveLength(1);
    for (const o of options()) expect(o).toHaveAttribute('aria-selected');
  });

  it('is not a combobox — nothing expands, so nothing claims to', () => {
    render(<List />);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(listbox()).not.toHaveAttribute('aria-expanded');
    const filter = screen.getByRole('searchbox', { name: /Filter muscles/ });
    expect(filter).toHaveAttribute('aria-controls', listbox().id);
    expect(filter).not.toHaveAttribute('aria-expanded');
  });
});

describe('MuscleList — keyboard (selection does NOT follow focus)', () => {
  it('moves focus with the arrows without selecting anything', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<List onSelect={onSelect} />);
    const first = options()[0];
    act(() => first.focus());
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(options()[3]).toHaveFocus();
    // Three arrow presses, zero selections: the whole point of the pattern.
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects on Enter and on Space, and on click', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<List onSelect={onSelect} />);
    act(() => options()[0].focus());
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('gluteus-maximus');
    await user.keyboard('{ArrowDown} ');
    expect(onSelect).toHaveBeenLastCalledWith('adductor-magnus');
    await user.click(screen.getByRole('option', { name: 'Soleus' }));
    expect(onSelect).toHaveBeenLastCalledWith('soleus');
  });

  it('jumps to the ends with Home and End and stops there', async () => {
    const user = userEvent.setup();
    render(<List />);
    act(() => options()[0].focus());
    await user.keyboard('{End}');
    expect(options().at(-1)).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(options().at(-1)).toHaveFocus();
    await user.keyboard('{Home}');
    expect(options()[0]).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(options()[0]).toHaveFocus();
  });

  it('crosses a group boundary as one flat sequence', async () => {
    const user = userEvent.setup();
    render(<List />);
    // Hip extensors holds three; the fourth option is the next group's first.
    act(() => options()[2].focus());
    await user.keyboard('{ArrowDown}');
    expect(options()[3]).toHaveFocus();
    expect(options()[3]).toHaveAccessibleName('Rectus femoris');
  });

  it('shows focus visibly, from state, in either theme', async () => {
    const user = userEvent.setup();
    render(<List />);
    expect(options()[0].style.outline).toBe('');
    act(() => options()[0].focus());
    await user.keyboard('{ArrowDown}');
    // Inline styles cannot express :focus-visible, so the ring is explicit —
    // and THEME.accent resolves per theme through the custom property.
    expect(options()[1].style.outline).toBe('2px solid var(--color-accent)');
    expect(options()[0].style.outline).toBe('');
  });
});

describe('MuscleList — filter', () => {
  it('counts matches in a live region', () => {
    const { rerender } = render(<List />);
    expect(screen.getByTestId('muscle-matches')).toHaveAttribute(
      'role',
      'status'
    );
    expect(screen.getByTestId('muscle-matches')).toHaveTextContent(
      '118 muscles and tendons'
    );
    rerender(<List query="soleus" />);
    expect(screen.getByTestId('muscle-matches')).toHaveTextContent(
      '1 of 118 match'
    );
  });

  it('is case-insensitive, trims, ignores diacritics and takes coach words', () => {
    for (const q of ['SOLEUS', '  soleus ', 'sóleus']) {
      const { unmount } = render(<List query={q} />);
      expect(
        screen.getByRole('option', { name: 'Soleus' })
      ).toBeInTheDocument();
      unmount();
    }
    render(<List query="glutes" />);
    expect(
      screen.getByRole('option', { name: 'Gluteus maximus' })
    ).toBeInTheDocument();
  });

  it('keeps the selection and a tabbable option when the filter hides it', () => {
    render(<List query="soleus" selected="gluteus-maximus" />);
    // The hidden selection is still the selection — the card stays open — and
    // focus is not lost: the surviving row takes the roving tabindex.
    expect(options()).toHaveLength(1);
    expect(options()[0]).toHaveAccessibleName('Soleus');
    expect(options().filter((o) => o.tabIndex === 0)).toHaveLength(1);
    expect(
      screen.queryByRole('option', { name: 'Gluteus maximus' })
    ).toBeNull();
  });

  it('says so, without an empty group, when nothing matches', () => {
    render(<List query="zzzqqq" />);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByText('No muscle matches that.')).toBeInTheDocument();
    expect(screen.getByTestId('muscle-matches')).toHaveTextContent('0 of 118');
  });

  it('announces a stale deep link as an alert', () => {
    render(
      <List notice="That link points to a muscle this version does not have." />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('does not have');
  });
});

describe('MuscleCard', () => {
  const entry = index.all[0];
  const card = (props = {}) =>
    render(
      <MuscleCard
        muscle={props.muscle === undefined ? entry : props.muscle}
        band={props.band === undefined ? ACT_BANDS[0] : props.band}
        peakBand={
          props.peakBand === undefined ? peakBandOf(MUSCLES[0]) : props.peakBand
        }
        depthPercent={props.depthPercent ?? 10}
        phase={props.phase ?? 'Descent'}
        direction={props.direction ?? 'lowering'}
        onClear={props.onClear ?? (() => {})}
      />
    );

  it('shows name, region, role, a BAND and the two notes — never a number', () => {
    card();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Gluteus maximus' })
    ).toBeInTheDocument();
    expect(screen.getByText('Hip extensors')).toBeInTheDocument();
    expect(screen.getByText(/Main hip extensor/)).toBeInTheDocument();
    const band = screen.getByTestId('muscle-band');
    expect(band).toHaveTextContent('Low at 10% depth, lowering (Descent)');
    expect(band).toHaveTextContent(ACT_NOTE);
    // No percentage, no raw activation figure anywhere in the band line.
    expect(band.textContent).not.toMatch(/\d+\s*%\s*activation|0\.\d{2}/);
    expect(screen.getByText(ACT_BASIS)).toBeInTheDocument();
  });

  it('carries the peak line, so a Low reading at 10% is not the whole story', () => {
    card();
    expect(screen.getByTestId('muscle-peak')).toHaveTextContent(
      'Peaks at High in the drive.'
    );
  });

  it('replaces the band with ACT_NONE for a tendon', () => {
    const itb = index.all[7];
    card({ muscle: itb, band: null, peakBand: peakBandOf(MUSCLES[7]) });
    expect(screen.getByTestId('muscle-band')).toHaveTextContent(ACT_NONE);
    expect(screen.queryByTestId('muscle-peak')).toBeNull();
    expect(screen.queryByText(ACT_NOTE)).toBeNull();
    expect(screen.getByText(/Not contractile/)).toBeInTheDocument();
  });

  const cardWith = (muscle) => (
    <MuscleCard
      muscle={muscle}
      band={muscle ? ACT_BANDS[0] : null}
      peakBand={muscle ? peakBandOf(MUSCLES[0]) : null}
      depthPercent={10}
      phase="Descent"
      direction="lowering"
      onClear={() => {}}
    />
  );

  it('announces a selection through a live region, and never takes focus', () => {
    const { rerender } = render(cardWith(null));
    const live = screen.getByTestId('muscle-announce');
    expect(live).toHaveAttribute('role', 'status');
    // Mounted before it has anything to say: a role="status" that appears at
    // the same moment as its text is not reliably announced.
    expect(live.textContent).toBe('');
    expect(live.style.position).toBe('absolute');

    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    rerender(cardWith(entry));
    expect(live).toHaveTextContent('Showing Gluteus maximus');
    // Focus stays where the user put it — in the real page, in the listbox,
    // so arrowing on to the next muscle still works.
    expect(outside).toHaveFocus();
    outside.remove();
  });

  it('takes focus only on a clear, where the button it was on has unmounted', () => {
    const { rerender } = render(cardWith(entry));
    expect(document.activeElement).toBe(document.body);
    rerender(cardWith(null));
    expect(
      screen.getByRole('heading', { level: 3, name: 'Muscle detail' })
    ).toHaveFocus();
    expect(screen.getByTestId('muscle-announce').textContent).toBe('');
  });

  it('prompts rather than going blank with nothing selected', () => {
    card({ muscle: null, band: null, peakBand: null });
    expect(screen.getByText(/Pick a muscle from the list/)).toBeInTheDocument();
    expect(screen.queryByTestId('muscle-band')).toBeNull();
    // Focusable, so a clear has somewhere to put focus.
    expect(
      screen.getByRole('heading', { level: 3, name: 'Muscle detail' })
    ).toHaveAttribute('tabindex', '-1');
  });

  it('clears through the button', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    card({ onClear });
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('reads the band from bandOf, so card and model cannot disagree', () => {
    card({ band: bandOf(0.7) });
    expect(screen.getByTestId('muscle-band')).toHaveTextContent('High at 10%');
  });
});

describe('HeatmapLegend', () => {
  it('has one swatch per band with its name BESIDE it, plus the caveat', () => {
    render(<HeatmapLegend />);
    for (const b of ACT_BANDS) {
      const swatch = screen.getByTestId(`heat-swatch-${b.id}`);
      expect(swatch).toHaveAttribute('aria-hidden', 'true');
      // Text beside, never on: no new (ink, ground) pair to measure.
      expect(swatch.textContent).toBe('');
      expect(swatch.style.border).toBe('1px solid var(--color-border)');
      expect(screen.getByText(b.name)).toBeInTheDocument();
    }
    expect(screen.getByText(HEAT_LEGEND)).toBeInTheDocument();
  });

  it('draws each band as the ramp segment the model paints for it', () => {
    render(<HeatmapLegend />);
    const bg = ACT_BANDS.map(
      (b) => screen.getByTestId(`heat-swatch-${b.id}`).style.background
    );
    // Not a flat fill per band: a muscle at 0.29 is drawn near the Mid colour
    // and labelled Low, so a flat Low swatch would not match the model.
    const stops = [
      'var(--color-anatomy-heat-low)',
      'var(--color-anatomy-heat-mid)',
      'var(--color-anatomy-heat-high)',
      'var(--color-anatomy-heat-peak)',
    ];
    bg.forEach((style, i) => {
      expect(style, ACT_BANDS[i].id).toContain('linear-gradient');
      expect(style, ACT_BANDS[i].id).toContain(stops[i]);
      expect(style, ACT_BANDS[i].id).toContain(stops[i + 1]);
      expect(style.indexOf(stops[i])).toBeLessThan(style.indexOf(stops[i + 1]));
    });
    // Four tokens, three bands: every segment used, none twice at the same end.
    expect(bg).toHaveLength(3);
  });
});

describe('ViewOptions heatmap switch', () => {
  const opts = (props = {}) =>
    render(
      <ViewOptions
        layers={{ muscles: true, skeleton: true }}
        onLayer={props.onLayer ?? (() => {})}
        heatmap={props.heatmap ?? false}
        onHeatmap={props.onHeatmap}
        disabled={props.disabled ?? false}
      />
    );

  it('is a third switch, off by default, beside the two mesh layers', () => {
    opts();
    const sw = screen.getAllByRole('switch');
    expect(sw.map((s) => s.closest('label').textContent)).toEqual([
      'Muscles',
      'Skeleton',
      'Activation heatmap',
    ]);
    expect(
      screen.getByRole('switch', { name: 'Activation heatmap' })
    ).not.toBeChecked();
  });

  it('toggles through onHeatmap without touching onLayer', async () => {
    const user = userEvent.setup();
    const onHeatmap = vi.fn();
    const onLayer = vi.fn();
    opts({ onHeatmap, onLayer });
    await user.click(
      screen.getByRole('switch', { name: 'Activation heatmap' })
    );
    expect(onHeatmap).toHaveBeenCalledWith(true);
    expect(onLayer).not.toHaveBeenCalled();
  });

  it('is disabled with its siblings until the scene is ready', () => {
    opts({ disabled: true });
    for (const s of screen.getAllByRole('switch')) expect(s).toBeDisabled();
  });

  it('survives a missing onHeatmap rather than throwing', async () => {
    const user = userEvent.setup();
    opts();
    await expect(
      user.click(screen.getByRole('switch', { name: 'Activation heatmap' }))
    ).resolves.toBeUndefined();
  });
});
