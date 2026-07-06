import { describe, it, expect } from 'vitest';
import { slugForExerciseName } from '../movementSlug.js';

describe('slugForExerciseName', () => {
  it('strips rep-scheme and parenthetical text before slugging', () => {
    expect(slugForExerciseName('Barbell Bench Press · 3×6–8 (focus)')).toBe(
      'barbell-bench-press'
    );
  });

  it('slugs a plain name with no extra annotation', () => {
    expect(slugForExerciseName('Back Squat')).toBe('back-squat');
  });

  it('handles a name with a single-arm/side variant suffix', () => {
    expect(
      slugForExerciseName('Cable Lateral Raise (single arm) · 3×12/side')
    ).toBe('cable-lateral-raise');
  });

  it('returns null for empty/nullish input', () => {
    expect(slugForExerciseName('')).toBeNull();
    expect(slugForExerciseName(null)).toBeNull();
    expect(slugForExerciseName(undefined)).toBeNull();
  });
});
