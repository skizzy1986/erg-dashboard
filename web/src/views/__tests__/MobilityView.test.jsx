import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobilityView from '../MobilityView.jsx';

describe('MobilityView', () => {
  it('renders the routines library and tracking sections', () => {
    render(<MobilityView />);
    expect(
      screen.getByText(/MOBILITY — a training pillar/i)
    ).toBeInTheDocument();
    expect(screen.getByText('ROUTINES · ON HAND')).toBeInTheDocument();
    expect(screen.getByText('Foam Roll / Soft Tissue')).toBeInTheDocument();
    expect(screen.getByText('RECENT · TRACKED')).toBeInTheDocument();
  });

  it('expands and collapses a routine to reveal its blocks', () => {
    render(<MobilityView />);
    const routine = screen.getByText('Foam Roll / Soft Tissue');
    // Collapsed by default — block detail is hidden.
    expect(screen.queryByText(/Thoracic spine/i)).not.toBeInTheDocument();

    fireEvent.click(routine);
    expect(screen.getByText(/Thoracic spine/i)).toBeInTheDocument();
    // Rehab blocks carry a · REHAB tag.
    expect(screen.getAllByText(/· REHAB/i).length).toBeGreaterThan(0);

    // Clicking again collapses it (covers the toggle-to-null path).
    fireEvent.click(routine);
    expect(screen.queryByText(/Thoracic spine/i)).not.toBeInTheDocument();
  });
});
