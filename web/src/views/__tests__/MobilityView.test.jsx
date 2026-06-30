import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  MOBILITY_ROUTINES,
  MOBILITY_STREAK_NOTE,
} from '../../constants/logs.js';
import MobilityView from '../MobilityView.jsx';

const renderView = (props = {}) =>
  render(<MobilityView mobOpen={null} setMobOpen={() => {}} {...props} />);

const first = MOBILITY_ROUTINES[0];

describe('MobilityView', () => {
  it('renders the routines library with every routine name', () => {
    renderView();
    expect(screen.getByText(/ROUTINES · ON HAND/)).toBeInTheDocument();
    for (const r of MOBILITY_ROUTINES) {
      expect(screen.getByText(r.name)).toBeInTheDocument();
    }
  });

  it('toggles a routine open via setMobOpen when its card is clicked', () => {
    const setMobOpen = vi.fn();
    renderView({ setMobOpen });
    fireEvent.click(screen.getByText(first.name));
    expect(setMobOpen).toHaveBeenCalledWith(first.id);
  });

  it('shows a routine’s block detail when it is the open card', () => {
    renderView({ mobOpen: first.id });
    // the first move of the open routine's first block is now visible
    expect(screen.getByText(first.blocks[0].move)).toBeInTheDocument();
  });

  it('collapses an open routine back to null when clicked again', () => {
    const setMobOpen = vi.fn();
    renderView({ mobOpen: first.id, setMobOpen });
    fireEvent.click(screen.getByText(first.name));
    expect(setMobOpen).toHaveBeenCalledWith(null);
  });

  it('renders the consistency streak note', () => {
    renderView();
    expect(
      screen.getByText(new RegExp(MOBILITY_STREAK_NOTE.slice(0, 24)))
    ).toBeInTheDocument();
  });
});
