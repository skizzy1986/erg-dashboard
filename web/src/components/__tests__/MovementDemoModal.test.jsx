import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MovementDemoModal from '../MovementDemoModal.jsx';

// react-three-fiber's <Canvas> requires a WebGL context, unavailable under
// jsdom — mock the 3D figure out and test the modal's non-3D chrome only.
vi.mock('../MovementFigure3D.jsx', () => ({
  default: () => null,
}));

vi.mock('../../constants/movementDemos.js', () => ({
  MOVEMENT_DEMOS: {
    'back-squat': {
      name: 'Back Squat',
      primaryMuscles: ['quadriceps', 'glutes'],
      secondaryMuscles: ['hamstrings'],
      phases: [
        {
          label: 'Set-up',
          cues: ['Brace core', 'Feet shoulder width'],
          primaryMuscles: ['abdominals'],
          secondaryMuscles: [],
        },
        {
          label: 'Eccentric',
          cues: ['Sit back and down'],
          primaryMuscles: ['quadriceps'],
          secondaryMuscles: ['glutes'],
        },
      ],
    },
  },
}));

describe('MovementDemoModal', () => {
  it('shows the coming-soon fallback for an uncurated exercise', () => {
    render(
      <MovementDemoModal
        exerciseName="Some Uncurated Move"
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/Demonstration coming soon/)).toBeInTheDocument();
  });

  it('renders phase cues and prime movers for a curated exercise', () => {
    render(
      <MovementDemoModal
        exerciseName="Back Squat · 4–5×5–6 (focus)"
        onClose={() => {}}
      />
    );
    expect(screen.getAllByText('Back Squat').length).toBeGreaterThan(0);
    expect(screen.getByText('Brace core')).toBeInTheDocument();
    expect(screen.getByText('quadriceps')).toBeInTheDocument();
  });

  it('switches phase cues when a phase button is clicked', () => {
    render(<MovementDemoModal exerciseName="Back Squat" onClose={() => {}} />);
    fireEvent.click(screen.getByText('Eccentric'));
    expect(screen.getByText('Sit back and down')).toBeInTheDocument();
    expect(screen.queryByText('Brace core')).not.toBeInTheDocument();
  });

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn();
    render(<MovementDemoModal exerciseName="Back Squat" onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
