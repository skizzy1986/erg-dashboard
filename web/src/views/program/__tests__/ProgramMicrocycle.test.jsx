import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgramMicrocycle from '../ProgramMicrocycle.jsx';

describe('ProgramMicrocycle', () => {
  it('renders both roster weeks', () => {
    render(<ProgramMicrocycle />);
    expect(screen.getAllByText(/HOME WEEK/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/FIFO WEEK/i).length).toBeGreaterThan(0);
  });

  it('renders the Technogym conversion note', () => {
    render(<ProgramMicrocycle />);
    expect(
      screen.getByText(/Technogym ↔ Concept2 conversion/i)
    ).toBeInTheDocument();
  });
});
