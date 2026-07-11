import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgramYear from '../ProgramYear.jsx';

describe('ProgramYear', () => {
  it('renders the season target and annual arc', () => {
    render(<ProgramYear />);
    expect(screen.getByText(/SEASON TARGET/i)).toBeInTheDocument();
    expect(screen.getByText(/ANNUAL ARC:/i)).toBeInTheDocument();
  });

  it('renders the event pathway and organisations sections', () => {
    render(<ProgramYear />);
    expect(
      screen.getByText(/EVENT PATHWAY · HOME ERG → INTERNATIONAL/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/ORGANISATIONS TO FOLLOW/i)).toBeInTheDocument();
  });
});
