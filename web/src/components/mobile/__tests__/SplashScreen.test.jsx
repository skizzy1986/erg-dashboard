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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SplashScreen', () => {
  it('renders the fixed brand lockup and caption', () => {
    render(<SplashScreen />);
    expect(screen.getByText('SYNCING TRAINING LOG')).toBeInTheDocument();
    expect(screen.getByText('IQ')).toBeInTheDocument();
    expect(screen.getByText(/Split/)).toBeInTheDocument();
  });

  it('shows the Spanish brand tagline, marked lang="es"', () => {
    render(<SplashScreen />);
    const tagline = screen.getByText('Entrena con cabeza', { exact: true });
    expect(tagline).toHaveAttribute('lang', 'es');
  });

  it('puts the tagline after the wordmark, as the only lang-marked element', () => {
    const { container } = render(<SplashScreen />);
    const word = container.querySelector('.siq-splash__word');
    const tagline = screen.getByText('Entrena con cabeza');
    expect(
      word.compareDocumentPosition(tagline) &
        document.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    const marked = container.firstChild.querySelectorAll('[lang]');
    expect(marked).toHaveLength(1);
    expect(marked[0]).toBe(tagline);
  });

  it('cycles ERG, STRENGTH, BIKE, hidden from assistive tech, before the tagline', () => {
    const { container } = render(<SplashScreen />);
    const words = ['ERG', 'STRENGTH', 'BIKE'].map((w) => screen.getByText(w));
    const tagline = screen.getByText('Entrena con cabeza');
    for (const word of words) {
      expect(word).toHaveAttribute('aria-hidden', 'true');
    }
    const order = [...words, tagline];
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
    expect(screen.getByText('Entrena con cabeza')).toBeInTheDocument();
  });

  it('injects exactly one stylesheet', () => {
    const { container } = render(<SplashScreen />);
    expect(container.querySelectorAll('style')).toHaveLength(1);
  });
});
