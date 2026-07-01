import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProgramView from '../ProgramView.jsx';

const renderView = () =>
  render(<ProgramView expanded={null} setExpanded={vi.fn()} />);

describe('ProgramView', () => {
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
