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
    expect(screen.getByText('ERG · STRENGTH · BIKE')).toBeInTheDocument();
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
  });

  it('injects exactly one stylesheet', () => {
    const { container } = render(<SplashScreen />);
    expect(container.querySelectorAll('style')).toHaveLength(1);
  });
});
