import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StageControls from '../components/StageControls.jsx';
import { LAYERS_UNAVAILABLE } from '../components/ViewOptions.jsx';
import { useAnatomyViewState } from '../hooks/useAnatomyViewState.js';

const REP = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/squat/assets/squat-manifest.json'),
    'utf8'
  )
).meta.rep;

const camera = () => ({
  reset: vi.fn(),
  preset: vi.fn(),
  orbit: vi.fn(),
  zoom: vi.fn(),
});

function Harness({ wide = false, sceneBlocked = false, ...rest }) {
  const view = useAnatomyViewState(REP);
  return (
    <StageControls
      view={view}
      camera={camera()}
      cameraDisabled={false}
      sceneBlocked={sceneBlocked}
      wide={wide}
      onGuide={rest.onGuide ?? vi.fn()}
      {...rest}
    />
  );
}

const FOLLOWING = 4; // Node.DOCUMENT_POSITION_FOLLOWING
const rail = () => screen.getByRole('region', { name: 'Controls' });
const tab = (name) => screen.getByRole('button', { name, exact: true });

describe('StageControls on desktop (criterion 17)', () => {
  it('is one rail holding every group, in the specified order', () => {
    render(<Harness wide />);
    const r = rail();
    const order = [
      within(r).getByRole('button', { name: 'Step back' }),
      within(r).getByRole('button', { name: 'Play' }),
      within(r).getByRole('slider', { name: 'Rep time' }),
      within(r).getByRole('group', { name: 'Jump to phase' }),
      within(r).getByRole('group', { name: 'Camera controls' }),
      within(r).getByRole('group', { name: 'Show' }),
      within(r).getByRole('button', { name: 'Coaching guide' }),
    ];
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1].compareDocumentPosition(order[i]) & FOLLOWING
      ).toBeTruthy();
    }
    // Group names are h3s under the rail's one h2.
    expect(
      within(r).getByRole('heading', { level: 2, name: 'Controls' })
    ).toBeInTheDocument();
    for (const name of ['Rep time', 'Camera controls']) {
      expect(
        within(r).getByRole('heading', { level: 3, name })
      ).toBeInTheDocument();
    }
  });

  it('docks the groups to the rail: none carries the old card', () => {
    render(<Harness wide />);
    const groups = [
      screen.getByRole('heading', { name: 'Rep time' }).closest('section'),
      screen.getByRole('group', { name: 'Camera controls' }),
      screen.getByRole('group', { name: 'Show' }),
    ];
    for (const g of groups) {
      expect(g.style.background).toBe('');
      expect(g.style.borderRadius).not.toBe('12px');
      expect(g.style.padding).not.toBe('16px');
    }
    // The rail is the one card.
    expect(rail().style.borderRadius).toBe('12px');
  });

  it('declares 44 px targets on every rail control (style contract)', () => {
    render(<Harness wide />);
    for (const b of within(rail()).getAllByRole('button')) {
      expect(b.style.minHeight).toBe('44px');
    }
    expect(screen.getByRole('slider', { name: 'Rep time' }).style.height).toBe(
      '44px'
    );
  });

  it('opens the guide from the footer', async () => {
    const user = userEvent.setup();
    const onGuide = vi.fn();
    render(<Harness wide onGuide={onGuide} />);
    await user.click(tab('Coaching guide'));
    await user.click(tab('Metrics and targets'));
    expect(onGuide.mock.calls).toEqual([['phases'], ['metrics']]);
  });

  it('renders the share and camera-mode slots only when given', () => {
    const { rerender } = render(<Harness wide />);
    expect(screen.queryByTestId('share-slot')).toBeNull();
    rerender(
      <Harness wide share={<button data-testid="share-slot">Copy link</button>}>
        <div data-testid="mode-slot" />
      </Harness>
    );
    expect(screen.getByTestId('share-slot')).toBeInTheDocument();
    expect(
      screen
        .getByTestId('mode-slot')
        .compareDocumentPosition(
          screen.getByRole('group', { name: 'Camera controls' })
        ) & FOLLOWING
    ).toBeTruthy();
  });
});

// R11 Gate 2 (G2-1): at 1280 × 720 the rail had 11 px of slack above its
// footer, so Share joins the footer as a third button instead of a row.
describe('the share slot on desktop', () => {
  it('is a third footer column, after the guide buttons, with no rule of its own', () => {
    const { rerender } = render(<Harness wide />);
    const footer = tab('Coaching guide').parentElement;
    expect(footer.style.gridTemplateColumns).toBe(
      'repeat(2, minmax(0px, 1fr))'
    );
    const rules = () =>
      [...rail().querySelectorAll('div')].filter(
        (d) => d.style.borderTop && !d.style.display
      ).length;
    const before = rules();
    rerender(
      <Harness
        wide
        share={<button data-testid="share-slot">Copy link</button>}
      />
    );
    expect(footer.style.gridTemplateColumns).toBe(
      'repeat(3, minmax(0px, 1fr))'
    );
    expect(screen.getByTestId('share-slot').parentElement).toBe(footer);
    expect(footer.lastElementChild).toBe(screen.getByTestId('share-slot'));
    // The overlay panel is positioned against the footer.
    expect(footer.style.position).toBe('relative');
    expect(rules()).toBe(before);
  });

  it('stays in the footer without a 3D view', () => {
    render(
      <Harness
        wide
        sceneBlocked
        share={<button data-testid="share-slot">Copy link</button>}
      />
    );
    expect(screen.getByTestId('share-slot').parentElement).toBe(
      tab('Coaching guide').parentElement
    );
  });
});

describe('StageControls on a phone (criterion 19)', () => {
  it('keeps play and the slider in the bar, and opens Rep by default', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Rep time' })).toBeVisible();
    expect(tab('Rep')).toHaveAttribute('aria-expanded', 'true');
    expect(tab('View')).toHaveAttribute('aria-expanded', 'false');
    expect(tab('Show')).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('group', { name: 'Jump to phase' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Camera controls' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Show' })).toBeNull();
    // The guide buttons are not phone-bar tools: the page holds them.
    expect(screen.queryByRole('button', { name: 'Coaching guide' })).toBeNull();
  });

  it('shows one group at a time, by the hidden attribute', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const panel = (name) =>
      document.getElementById(tab(name).getAttribute('aria-controls'));
    await user.click(tab('View'));
    expect(tab('View')).toHaveAttribute('aria-expanded', 'true');
    expect(tab('Rep')).toHaveAttribute('aria-expanded', 'false');
    expect(panel('View')).not.toHaveAttribute('hidden');
    expect(panel('Rep')).toHaveAttribute('hidden');
    expect(panel('Show')).toHaveAttribute('hidden');
    expect(
      screen.getByRole('group', { name: 'Camera controls' })
    ).toBeInTheDocument();

    await user.click(tab('Show'));
    expect(panel('Show')).not.toHaveAttribute('hidden');
    expect(panel('View')).toHaveAttribute('hidden');
    expect(
      screen.getByRole('switch', { name: 'Activation heatmap' })
    ).toBeInTheDocument();

    // A second press folds the open group away.
    await user.click(tab('Show'));
    expect(tab('Show')).toHaveAttribute('aria-expanded', 'false');
    expect(panel('Show')).toHaveAttribute('hidden');
  });

  it('offers Share only when the slot has content', () => {
    const { rerender } = render(<Harness />);
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
    rerender(<Harness share={<button>Copy link</button>} />);
    expect(tab('Share')).toHaveAttribute('aria-expanded', 'false');
  });

  it('has nothing hover-only: no mouse-enter or mouse-over handlers', () => {
    for (const f of [
      'StageControls.jsx',
      'TimeControls.jsx',
      'CameraControls.jsx',
      'ViewOptions.jsx',
      'SquatStage.jsx',
    ]) {
      const src = readFileSync(
        join(process.cwd(), 'src/squat/components', f),
        'utf8'
      );
      expect(src, f).not.toMatch(/onMouse(Enter|Over|Leave)|:hover/);
    }
  });
});

describe('StageControls without a 3D view (criterion 21)', () => {
  // Gate 2 amendment (2026-11-12): the Show group stays, so the heatmap
  // switch can drive the strain readout; only its layer switches are gated.
  it('keeps the time controls and Show, drops the camera, gates the layers', () => {
    render(<Harness wide sceneBlocked />);
    expect(screen.getByRole('slider', { name: 'Rep time' })).toBeEnabled();
    expect(
      screen.getByRole('group', { name: 'Jump to phase' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Camera controls' })).toBeNull();
    const show = screen.getByRole('group', { name: 'Show' });
    expect(show).toHaveAccessibleDescription(LAYERS_UNAVAILABLE);
    expect(
      within(show).getByRole('switch', { name: 'Muscles' })
    ).toBeDisabled();
    expect(
      within(show).getByRole('switch', { name: 'Skeleton' })
    ).toBeDisabled();
    expect(
      within(show).getByRole('switch', { name: 'Activation heatmap' })
    ).toBeEnabled();
  });

  it('drops the camera once the model has failed, and gates the layers', () => {
    render(<Harness wide sceneFailed />);
    expect(screen.queryByRole('group', { name: 'Camera controls' })).toBeNull();
    expect(screen.getByRole('switch', { name: 'Muscles' })).toBeDisabled();
    expect(
      screen.getByRole('switch', { name: 'Activation heatmap' })
    ).toBeEnabled();
  });

  it('puts the strain readout in the rail after Show, before the footer', () => {
    render(
      <Harness wide sceneBlocked strain={<p data-testid="strain">s</p>} />
    );
    const show = screen.getByRole('group', { name: 'Show' });
    const strain = screen.getByTestId('strain');
    expect(rail()).toContainElement(strain);
    expect(show.compareDocumentPosition(strain) & FOLLOWING).toBeTruthy();
    expect(
      strain.compareDocumentPosition(
        screen.getByRole('button', { name: 'Coaching guide' })
      ) & FOLLOWING
    ).toBeTruthy();
  });

  it('on a phone, puts the strain readout atop the bar, above the time', () => {
    render(<Harness sceneBlocked strain={<p data-testid="strain">s</p>} />);
    const strain = screen.getByTestId('strain');
    expect(rail()).toContainElement(strain);
    expect(
      strain.compareDocumentPosition(
        screen.getByRole('slider', { name: 'Rep time' })
      ) & FOLLOWING
    ).toBeTruthy();
  });

  it('puts the share slot straight after the time controls', () => {
    render(
      <Harness
        wide
        sceneBlocked
        share={<button data-testid="share-slot">Copy link</button>}
      />
    );
    const pills = screen.getByRole('group', { name: 'Jump to phase' });
    expect(
      pills.compareDocumentPosition(screen.getByTestId('share-slot')) &
        FOLLOWING
    ).toBeTruthy();
  });

  it('on a phone, with Share, the groups are Rep, Show and Share', async () => {
    const user = userEvent.setup();
    render(<Harness sceneBlocked share={<button>Copy link</button>} />);
    expect(tab('Rep')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('button', { name: 'View' })).toBeNull();
    await user.click(tab('Show'));
    expect(
      screen.getByRole('switch', { name: 'Activation heatmap' })
    ).toBeEnabled();
    expect(screen.getByRole('switch', { name: 'Skeleton' })).toBeDisabled();
    await user.click(tab('Share'));
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeVisible();
  });
});
