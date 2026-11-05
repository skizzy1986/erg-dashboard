import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SquatApp, { PAGE_DESCRIPTION, PAGE_TITLE } from '../SquatApp.jsx';

const mocks = vi.hoisted(() => ({ caps: null, workers: [] }));
vi.mock('../hooks/useCapabilities.js', () => ({
  useCapabilities: () => mocks.caps,
}));
vi.mock('../workers/createAnatomyWorker.js', () => ({
  createAnatomyWorker: () => {
    const w = { postMessage: vi.fn(), terminate: vi.fn() };
    mocks.workers.push(w);
    return w;
  },
}));
vi.mock('../../utils/sentry.js', () => ({ captureError: vi.fn() }));

const manifest = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/squat/assets/squat-manifest.json'),
    'utf8'
  )
);

beforeEach(() => {
  mocks.caps = { webgl: true, decompression: true, worker: true };
  mocks.workers.length = 0;
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: () => Promise.resolve(manifest) });
  window.history.replaceState(null, '', '/squat');
  document.title = 'SplitIQ';
});

afterEach(() => window.localStorage.clear());

describe('SquatApp', () => {
  it('renders the shell, sets the page title, and restores it on unmount', async () => {
    const { unmount, container } = render(<SquatApp />);
    expect(document.title).toBe(PAGE_TITLE);
    expect(
      document.querySelector('meta[name="description"]').getAttribute('content')
    ).toBe(PAGE_DESCRIPTION);
    expect(
      screen.getByRole('heading', { level: 1, name: 'High-bar back squat' })
    ).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toMatch(
      /Downloading anatomy/
    );
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('data-theme', 'light');
    await waitFor(() =>
      expect(
        screen.getByText('10 of 10 targets met by the reference rep')
      ).toBeInTheDocument()
    );
    expect(window.__squat).toBeUndefined();
    unmount();
    expect(document.title).toBe('SplitIQ');
    expect(document.querySelector('meta[name="description"]')).toBeNull();
  });

  it('keeps an existing description meta and restores its content', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', 'Dashboard');
    document.head.appendChild(meta);
    const { unmount } = render(<SquatApp />);
    expect(meta.getAttribute('content')).toBe(PAGE_DESCRIPTION);
    unmount();
    expect(meta.getAttribute('content')).toBe('Dashboard');
    meta.remove();
  });

  it('opens the guide from the hero, deep-links it, and closes it', async () => {
    const user = userEvent.setup();
    render(<SquatApp />);
    await user.click(screen.getByRole('button', { name: 'Coaching guide' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(window.location.hash).toBe('#guide=phases');
    await user.keyboard('{ArrowRight}');
    expect(window.location.hash).toBe('#guide=metrics');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.location.hash).toBe('');
  });

  it('opens straight to a pane from the URL, and Sources from the footer', async () => {
    window.history.replaceState(null, '', '/squat#guide=method');
    const user = userEvent.setup();
    const { unmount } = render(<SquatApp />);
    expect(
      screen.getByRole('tab', { name: 'Method and limits' })
    ).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Escape}');
    await user.click(
      within(screen.getByRole('contentinfo')).getByRole('button', {
        name: 'Sources',
      })
    );
    expect(screen.getByRole('tab', { name: 'Sources' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    unmount();
  });

  it('switches to dark on the tool root and the document ground', async () => {
    const user = userEvent.setup();
    const { container } = render(<SquatApp />);
    // Phone layout (no matchMedia): one cycling button, Auto → Light → Dark.
    await user.click(screen.getByRole('button', { name: /Switch to Light/ }));
    await user.click(screen.getByRole('button', { name: /Switch to Dark/ }));
    expect(container.firstChild).toHaveAttribute('data-theme', 'dark');
    expect(document.body.style.backgroundColor).toBe('rgb(8, 8, 13)');
  });

  it('keeps the guide and form check without WebGL, and skips the download', async () => {
    mocks.caps = { webgl: false, decompression: true, worker: true };
    render(<SquatApp />);
    expect(
      screen.getByRole('note', { name: '3D view unavailable' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText('10 of 10 targets met by the reference rep')
      ).toBeInTheDocument()
    );
    expect(mocks.workers).toHaveLength(0);
    expect(
      screen.getByRole('button', { name: 'Coaching guide' })
    ).toBeEnabled();
  });

  it('opens the method pane from the modelled-values note', async () => {
    const user = userEvent.setup();
    render(<SquatApp />);
    await user.click(screen.getByRole('button', { name: 'Method and limits' }));
    expect(
      screen.getByRole('tab', { name: 'Method and limits' })
    ).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Cues and faults' }));
    expect(screen.getByRole('tab', { name: 'Phases' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('lays out the desktop grid at 761 px and up', async () => {
    window.matchMedia = (q) => ({
      matches: q === '(min-width: 761px)',
      addEventListener() {},
      removeEventListener() {},
    });
    try {
      const user = userEvent.setup();
      render(<SquatApp />);
      expect(
        screen.getByRole('link', { name: /Open SplitIQ/ })
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.getByText('10 of 10 targets met by the reference rep')
        ).toBeInTheDocument()
      );
      await user.click(
        screen.getByRole('button', { name: 'Metrics and targets' })
      );
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('row')).toHaveLength(19);
      expect(screen.getByText('1.15 at depth')).toBeInTheDocument();
    } finally {
      delete window.matchMedia;
    }
  });
});
