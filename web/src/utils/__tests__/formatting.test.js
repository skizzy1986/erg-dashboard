import { describe, it, expect } from 'vitest';
import {
  normType,
  workoutAccent,
  assessMacro,
  macroColor,
  bpCategory,
} from '../formatting.js';

describe('normType', () => {
  it('passes through canonical types unchanged', () => {
    expect(normType('Z2 Aerobic')).toBe('Z2 Aerobic');
    expect(normType('Threshold')).toBe('Threshold');
    expect(normType('Upper Strength')).toBe('Upper Strength');
    expect(normType('Cycling')).toBe('Cycling');
    expect(normType('Rest')).toBe('Rest');
  });

  it('maps "erg" to Z2 Aerobic', () => {
    expect(normType('erg')).toBe('Z2 Aerobic');
    expect(normType('ERG')).toBe('Z2 Aerobic');
  });

  it('maps "strength" with an upper label to Upper Strength', () => {
    expect(normType('strength', 'Upper Body Push')).toBe('Upper Strength');
    expect(normType('Strength', 'UPPER')).toBe('Upper Strength');
  });

  it('maps "strength" with a lower label to Lower Strength', () => {
    expect(normType('strength', 'Lower Body')).toBe('Lower Strength');
  });

  it('maps "strength" with no upper/lower hint to Combined', () => {
    expect(normType('strength')).toBe('Combined');
    expect(normType('strength', 'Full session')).toBe('Combined');
  });

  it('maps bike/ride/cycling synonyms to Cycling', () => {
    expect(normType('cycling')).toBe('Cycling');
    expect(normType('bike')).toBe('Cycling');
    expect(normType('ride')).toBe('Cycling');
  });

  it('maps mobility and rest to Rest', () => {
    expect(normType('mobility')).toBe('Rest');
    expect(normType('rest')).toBe('Rest');
  });

  it('returns unknown types verbatim as a grey fallback', () => {
    expect(normType('swimming')).toBe('swimming');
  });

  it('handles undefined / empty type without throwing', () => {
    expect(normType(undefined)).toBe(undefined);
    expect(normType('')).toBe('');
  });

  it('defaults the label argument to an empty string', () => {
    expect(normType('strength')).toBe('Combined');
  });
});

describe('workoutAccent', () => {
  it('returns the grey default for empty input', () => {
    expect(workoutAccent('')).toBe('#3a3a4a');
    expect(workoutAccent(undefined)).toBe('#3a3a4a');
  });

  it('colours lower-body sessions green', () => {
    expect(workoutAccent('Lower Strength')).toBe('#34d399');
  });

  it('colours upper-body sessions purple', () => {
    expect(workoutAccent('Upper Strength')).toBe('#a78bfa');
  });

  it('colours rate ladder / threshold sessions yellow', () => {
    expect(workoutAccent('Rate Ladder')).toBe('#ffd700');
    expect(workoutAccent('Threshold pieces')).toBe('#ffd700');
  });

  it('colours interval / VO2 sessions orange', () => {
    expect(workoutAccent('VO2 max intervals')).toBe('#ff6b35');
    expect(workoutAccent('Interval session')).toBe('#ff6b35');
  });

  it('colours yoga / foam / rest sessions grey', () => {
    expect(workoutAccent('Yoga flow')).toBe('#3a3a4a');
    expect(workoutAccent('Foam rolling')).toBe('#3a3a4a');
    expect(workoutAccent('Rest day')).toBe('#3a3a4a');
  });

  it('falls back to erg aerobic blue for anything else', () => {
    expect(workoutAccent('Z2 Aerobic')).toBe('#00d4ff');
    expect(workoutAccent('Steady state')).toBe('#00d4ff');
  });

  it('is case-insensitive', () => {
    expect(workoutAccent('LOWER')).toBe('#34d399');
  });
});

describe('assessMacro', () => {
  it('returns a dash when value is not a number', () => {
    expect(assessMacro('120', [100, 150])).toBe('—');
    expect(assessMacro(undefined, [100, 150])).toBe('—');
  });

  it('returns a dash when range is not a valid two-element array', () => {
    expect(assessMacro(120, [100])).toBe('—');
    expect(assessMacro(120, null)).toBe('—');
    expect(assessMacro(120, 'range')).toBe('—');
  });

  it('returns a tick when value is within range (inclusive)', () => {
    expect(assessMacro(125, [100, 150])).toBe('✅');
    expect(assessMacro(100, [100, 150])).toBe('✅');
    expect(assessMacro(150, [100, 150])).toBe('✅');
  });

  it('warns when value is just below the floor (>= 90% of min)', () => {
    expect(assessMacro(95, [100, 150])).toBe('⚠️');
    expect(assessMacro(90, [100, 150])).toBe('⚠️');
  });

  it('fails when value is well below the floor (< 90% of min)', () => {
    expect(assessMacro(80, [100, 150])).toBe('❌');
  });

  it('warns when value is just above the ceiling (<= 115% of max)', () => {
    expect(assessMacro(170, [100, 150])).toBe('⚠️');
    expect(assessMacro(172.5, [100, 150])).toBe('⚠️');
  });

  it('fails when value is well above the ceiling (> 115% of max)', () => {
    expect(assessMacro(180, [100, 150])).toBe('❌');
  });
});

describe('macroColor', () => {
  it('returns green for a tick', () => {
    expect(macroColor('✅')).toBe('#34d399');
  });

  it('returns yellow for a warning', () => {
    expect(macroColor('⚠️')).toBe('#ffd700');
  });

  it('returns red for a fail (or any other status)', () => {
    expect(macroColor('❌')).toBe('#ff2d55');
    expect(macroColor('—')).toBe('#ff2d55');
  });
});

describe('bpCategory', () => {
  it('flags non-numeric readings', () => {
    expect(bpCategory('120', 80)).toEqual({
      label: 'Check reading',
      color: '#888',
    });
    expect(bpCategory(120, undefined)).toEqual({
      label: 'Check reading',
      color: '#888',
    });
  });

  it('flags implausible systolic values', () => {
    expect(bpCategory(50, 70)).toMatchObject({ label: 'Check reading' });
    expect(bpCategory(300, 90)).toMatchObject({ label: 'Check reading' });
  });

  it('flags implausible diastolic values', () => {
    expect(bpCategory(120, 20)).toMatchObject({ label: 'Check reading' });
    expect(bpCategory(120, 200)).toMatchObject({ label: 'Check reading' });
  });

  it('flags readings where diastolic >= systolic', () => {
    expect(bpCategory(110, 110)).toMatchObject({ label: 'Check reading' });
    expect(bpCategory(100, 120)).toMatchObject({ label: 'Check reading' });
  });

  it('classifies optimal readings', () => {
    expect(bpCategory(115, 75)).toEqual({
      label: 'Optimal',
      color: '#34d399',
    });
  });

  it('classifies normal readings (120-129 systolic, < 80 diastolic)', () => {
    expect(bpCategory(125, 78)).toEqual({
      label: 'Normal',
      color: '#34d399',
    });
  });

  it('classifies high-normal readings', () => {
    expect(bpCategory(135, 85)).toEqual({
      label: 'High-normal',
      color: '#ffd700',
    });
    expect(bpCategory(125, 85)).toEqual({
      label: 'High-normal',
      color: '#ffd700',
    });
  });

  it('classifies elevated readings to note for the GP', () => {
    expect(bpCategory(150, 95)).toEqual({
      label: 'Elevated — note for GP',
      color: '#ff6b35',
    });
  });
});
