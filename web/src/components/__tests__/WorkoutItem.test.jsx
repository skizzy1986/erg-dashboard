import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkoutItem from '../WorkoutItem.jsx';

const fullSession = {
  label: 'Upper 1',
  done: true,
  slot: 'AM',
  note: 'Bench + pull focus',
  fuel: 'Oats + whey pre',
  meal: { pre: 'Banana', post: 'Rice + chicken' },
};
const rail = { top: 'MON', big: '1', bottom: 'wk4' };

describe('WorkoutItem', () => {
  it('renders an empty placeholder when there is no session', () => {
    render(<WorkoutItem session={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the rail, today marker, and a completed session', () => {
    render(<WorkoutItem session={fullSession} rail={rail} highlight />);
    expect(screen.getByText('MON')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // rail.big
    expect(screen.getByText('wk4')).toBeInTheDocument(); // rail.bottom
    expect(screen.getByText('● TODAY')).toBeInTheDocument();
    expect(screen.getByText('Upper 1')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument(); // done
    expect(screen.getByText(/AM/)).toBeInTheDocument(); // slot
  });

  it('expands to reveal note, fuel, and meal detail on click', () => {
    render(<WorkoutItem session={fullSession} rail={rail} />);
    expect(screen.queryByText(/Bench \+ pull focus/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Upper 1'));
    expect(screen.getByText(/Bench \+ pull focus/)).toBeInTheDocument();
    expect(screen.getByText(/Oats \+ whey pre/)).toBeInTheDocument();
    expect(screen.getByText(/Banana/)).toBeInTheDocument();
    expect(screen.getByText(/Rice \+ chicken/)).toBeInTheDocument();
  });

  it('renders an incomplete, detail-less session with the rail hidden', () => {
    render(
      <WorkoutItem session={{ label: 'Rest' }} rail={rail} showRail={false} />
    );
    expect(screen.getByText('Rest')).toBeInTheDocument();
    // No note/fuel/meal → not expandable, so no disclosure arrow.
    expect(screen.queryByText('▼')).not.toBeInTheDocument();
    // showRail=false → rail content is not rendered.
    expect(screen.queryByText('MON')).not.toBeInTheDocument();
  });
});
