import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProgramView from '../ProgramView.jsx';

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
});
