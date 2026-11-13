import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SplashScreen from '../SplashScreen.jsx';

function stubReducedMotion() {
  vi.stubGlobal('matchMedia', (media) => ({
    matches: true,
    media,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const pageLang = document.documentElement.lang;

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.lang = pageLang;
});

const LOCALES = [
  ['', 'Train Smarter', 'en', 'Smarter'],
  ['es', 'Entrena con cabeza', 'es', 'cabeza'],
];

// The line is split across spans (lead + head), so match on the whole line's
// textContent rather than a single text node.
const brandLineEl = (text) =>
  screen.getByText(
    (_, el) =>
      el.classList.contains('siq-splash__tagline') && el.textContent === text
  );

describe('SplashScreen', () => {
  it('renders the fixed brand lockup and caption', () => {
    render(<SplashScreen />);
    expect(screen.getByText('SYNCING TRAINING LOG')).toBeInTheDocument();
    expect(screen.getByText('IQ')).toBeInTheDocument();
    expect(screen.getByText(/Split/)).toBeInTheDocument();
  });

  it.each(LOCALES)(
    'shows the brand line for page lang %j, marked with its own lang',
    (pageLangValue, text, lang, head) => {
      document.documentElement.lang = pageLangValue;
      const { container } = render(<SplashScreen />);
      const line = brandLineEl(text);
      expect(line).toHaveAttribute('lang', lang);
      expect(line.querySelector('.siq-splash__tagline-head')).toHaveTextContent(
        new RegExp(`^${head}$`)
      );
      const marked = container.firstChild.querySelectorAll('[lang]');
      expect(marked).toHaveLength(1);
      expect(marked[0]).toBe(line);
    }
  );

  it('cycles ERG, STRENGTH, BIKE, hidden from assistive tech, after the wordmark and before the line', () => {
    const { container } = render(<SplashScreen />);
    const wordmark = container.querySelector('.siq-splash__word');
    const words = ['ERG', 'STRENGTH', 'BIKE'].map((w) => screen.getByText(w));
    const tagline = brandLineEl('Train Smarter');
    for (const word of words) {
      expect(word).toHaveAttribute('aria-hidden', 'true');
    }
    const order = [wordmark, ...words, tagline];
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1].compareDocumentPosition(order[i]) &
          document.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
    expect(container.querySelector('[role="img"]')).toBeNull();
  });

  it('does not ship the mockup status bar', () => {
    render(<SplashScreen />);
    expect(screen.queryByText('5:41')).toBeNull();
    expect(screen.queryByText(/82%/)).toBeNull();
  });

  it('animates by default', () => {
    const { container } = render(<SplashScreen />);
    const root = container.firstChild;
    expect(root).toHaveClass('siq-splash');
    expect(root).not.toHaveClass('siq-splash--still');
  });

  it('switches to the still variant under prefers-reduced-motion', () => {
    stubReducedMotion();
    const { container } = render(<SplashScreen />);
    const root = container.firstChild;
    expect(root).toHaveClass('siq-splash--still');
    expect(screen.getByText('IQ')).toBeInTheDocument();
    expect(screen.getByText('SYNCING TRAINING LOG')).toBeInTheDocument();
    expect(brandLineEl('Train Smarter')).toBeInTheDocument();
  });

  it('injects exactly one stylesheet', () => {
    const { container } = render(<SplashScreen />);
    expect(container.querySelectorAll('style')).toHaveLength(1);
  });
});
