import { render, screen, within } from '@testing-library/react';
import StrainPanel, { strainLine } from '../components/StrainPanel.jsx';
import { ACT_BANDS, ACT_NOTE } from '../constants/activationBands.js';

const band = (id) => ACT_BANDS.find((b) => b.id === id);
const ITEMS = [
  { region: 1, i: 10, name: 'Vastus medialis', value: 0.9, band: band('high') },
  { region: 7, i: 47, name: 'Erector spinae', value: 0.5, band: band('mod') },
  { region: 0, i: 0, name: 'Gluteus maximus', value: 0.2, band: band('low') },
];

describe('StrainPanel (criteria 9, 12, 21, 23)', () => {
  it('names each region, its leading muscle and its band in text', () => {
    render(<StrainPanel items={ITEMS} phase="Bottom" />);
    // The ordered list; the colour key is a second (unordered) list.
    const rows = within(
      screen.getByTestId('strain-panel').querySelector('ol')
    ).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual([
      'Knee extensors: Vastus medialis (High)',
      'Trunk and bracing: Erector spinae (Moderate)',
      'Hip extensors: Gluteus maximus (Low)',
    ]);
    // The band is words, never colour alone: no swatch inside a row.
    for (const r of rows) {
      expect(r.querySelector('[data-testid^="heat-swatch"]')).toBeNull();
    }
    expect(strainLine(ITEMS[0])).toBe(rows[0].textContent);
  });

  it('is headed by the phase, and keeps the key and the caveat with it', () => {
    render(<StrainPanel items={ITEMS} phase="Bottom" />);
    const panel = screen.getByRole('region', {
      name: 'Working hardest now · Bottom',
    });
    expect(
      within(panel).getByRole('heading', { level: 2 })
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('heading', { level: 3, name: 'Activation key' })
    ).toBeInTheDocument();
    for (const b of ACT_BANDS) {
      expect(within(panel).getByTestId(`heat-swatch-${b.id}`)).toBeVisible();
    }
    expect(within(panel).getByText(ACT_NOTE)).toBeInTheDocument();
    expect(within(panel).getByText(/Tendons are not coloured/)).toBeVisible();
    // Over the canvas: it shows, and the drag goes through to the model.
    expect(panel.style.pointerEvents).toBe('none');
    expect(panel.style.background).toBe('var(--color-surface)');
  });

  it('inline (no model drawn): no colour key, the caveat stays', () => {
    render(<StrainPanel items={ITEMS} phase="Drive" inline />);
    const panel = screen.getByTestId('strain-panel');
    expect(within(panel).getByRole('heading', { level: 3 })).toHaveTextContent(
      'Working hardest now · Drive'
    );
    expect(within(panel).queryByText('Activation key')).toBeNull();
    expect(within(panel).getByText(ACT_NOTE)).toBeInTheDocument();
    expect(within(panel).queryByText(/Tendons are not coloured/)).toBeNull();
    expect(panel.style.pointerEvents).toBe('');
  });

  it('announces through one polite status region, fed from outside', () => {
    const { rerender } = render(<StrainPanel items={ITEMS} phase="Bottom" />);
    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('');
    rerender(<StrainPanel items={ITEMS} phase="Bottom" announce="said" />);
    expect(screen.getByRole('status')).toHaveTextContent('said');
  });
});
