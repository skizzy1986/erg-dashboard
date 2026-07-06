import { describe, it, expect } from 'vitest';
import { muscleColor } from '../muscleColor.js';

describe('muscleColor', () => {
  it('returns the primary color when the muscle is in the primary list', () => {
    expect(muscleColor('quadriceps', ['quadriceps'], [])).toBe('#ef4444');
  });

  it('returns the secondary color when the muscle is in the secondary list', () => {
    expect(muscleColor('hamstrings', ['quadriceps'], ['hamstrings'])).toBe(
      '#f59e0b'
    );
  });

  it('returns the inactive color when the muscle is in neither list', () => {
    expect(muscleColor('calves', ['quadriceps'], ['hamstrings'])).toBe(
      '#46525f'
    );
  });

  it('is case-insensitive', () => {
    expect(muscleColor('Quadriceps', ['quadriceps'], [])).toBe('#ef4444');
  });

  it('treats missing/empty lists as no match', () => {
    expect(muscleColor('quadriceps', undefined, undefined)).toBe('#46525f');
    expect(muscleColor('quadriceps', [], [])).toBe('#46525f');
  });
});
