import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorFallback from '../ErrorFallback.jsx';

describe('ErrorFallback', () => {
  it('renders an alert with recovery copy', () => {
    render(<ErrorFallback resetError={() => {}} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('calls resetError when the retry button is clicked', () => {
    const resetError = vi.fn();
    render(<ErrorFallback resetError={resetError} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(resetError).toHaveBeenCalledOnce();
  });
});
