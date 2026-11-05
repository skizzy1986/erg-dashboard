import { describe, it, expect } from 'vitest';
import {
  formatAnchor,
  parseJsonAnchor,
  validateNutritionTargets,
  validateDayPlan,
  listNiggles,
} from '../anchorValues.js';

// Synthetic example values only.
describe('formatAnchor', () => {
  it('formats value, unit and status', () => {
    expect(
      formatAnchor({ value: '200', unit: 'W', status: 'provisional' })
    ).toBe('200 W (provisional)');
  });

  it('omits a null status and a missing unit', () => {
    expect(formatAnchor({ value: 'base', unit: null, status: null })).toBe(
      'base'
    );
  });

  it('hides non-display units', () => {
    expect(
      formatAnchor({ value: 'x', unit: 'text', status: 'confirmed' })
    ).toBe('x (confirmed)');
    expect(formatAnchor({ value: '{}', unit: 'json' })).toBe('{}');
  });

  it('renders a dash for a missing row or value', () => {
    expect(formatAnchor(null)).toBe('—');
    expect(formatAnchor(undefined)).toBe('—');
    expect(formatAnchor({ value: null, status: 'provisional' })).toBe('—');
    expect(formatAnchor({ value: '' })).toBe('—');
  });
});

describe('parseJsonAnchor', () => {
  it('returns null value and no error for a missing row', () => {
    expect(parseJsonAnchor(null)).toEqual({ value: null, error: null });
    expect(parseJsonAnchor({ key: 'k', value: null })).toEqual({
      value: null,
      error: null,
    });
  });

  it('parses valid JSON that passes validation', () => {
    const r = parseJsonAnchor({ key: 'k', value: '{"a":1}' }, (o) => o.a === 1);
    expect(r).toEqual({ value: { a: 1 }, error: null });
  });

  it('parses without a validator', () => {
    expect(parseJsonAnchor({ key: 'k', value: '[1]' }).value).toEqual([1]);
  });

  it('reports invalid JSON naming the key, never the value', () => {
    const r = parseJsonAnchor({ key: 'example_plan', value: 'SECRET{' });
    expect(r.value).toBe(null);
    expect(r.error).toBeInstanceOf(Error);
    expect(r.error.message).toContain('example_plan');
    expect(r.error.message).not.toContain('SECRET');
  });

  it('reports a shape the validator rejects', () => {
    const r = parseJsonAnchor({ key: 'k', value: '{"a":2}' }, (o) => o.a === 1);
    expect(r.value).toBe(null);
    expect(r.error.message).toMatch(/unexpected shape/);
  });
});

describe('validateNutritionTargets', () => {
  const day = { cal: [1, 2], protein: [1, 2], carbs: [1, 2], fat: [1, 2] };

  it('accepts known day types with four ranges', () => {
    expect(validateNutritionTargets({ rest: day, training: day })).toBe(true);
    expect(validateNutritionTargets({ 'two-a-day': day })).toBe(true);
  });

  it('rejects bad shapes', () => {
    expect(validateNutritionTargets(null)).toBe(false);
    expect(validateNutritionTargets([])).toBe(false);
    expect(validateNutritionTargets({})).toBe(false);
    expect(validateNutritionTargets({ holiday: day })).toBe(false);
    expect(validateNutritionTargets({ rest: { ...day, fat: [2, 1] } })).toBe(
      false
    );
    expect(validateNutritionTargets({ rest: { ...day, cal: [1] } })).toBe(
      false
    );
    expect(
      validateNutritionTargets({ rest: { ...day, carbs: ['1', 2] } })
    ).toBe(false);
    expect(validateNutritionTargets({ rest: 'x' })).toBe(false);
  });
});

describe('validateDayPlan', () => {
  const d = { day: 'Mon', cal: 1, p: 1, c: 1, f: 1 };
  it('accepts a plan with valid days', () => {
    expect(validateDayPlan({ days: [d] })).toBe(true);
    expect(validateDayPlan({ trigger: 't', days: [{ ...d, cut: '-1' }] })).toBe(
      true
    );
  });
  it('rejects missing or malformed days', () => {
    expect(validateDayPlan(null)).toBe(false);
    expect(validateDayPlan({})).toBe(false);
    expect(validateDayPlan({ days: [] })).toBe(false);
    expect(validateDayPlan({ days: [{ ...d, cal: '1' }] })).toBe(false);
    expect(validateDayPlan({ days: [{ ...d, day: 1 }] })).toBe(false);
    expect(validateDayPlan({ days: [null] })).toBe(false);
  });
});

describe('listNiggles', () => {
  it('returns niggle anchors newest first, mapped', () => {
    const out = listNiggles({
      rowing_cp: { key: 'rowing_cp', value: '200' },
      'niggle:a': {
        key: 'niggle:a',
        value: 'Example A',
        note: 'Detail A',
        status: 'provisional',
        valid_from: '2026-01-01',
      },
      'niggle:b': {
        key: 'niggle:b',
        value: 'Example B',
        valid_from: '2026-02-01',
      },
      'niggle:c': { key: 'niggle:c', value: null },
    });
    expect(out.map((n) => n.slug)).toEqual(['b', 'a', 'c']);
    expect(out[1]).toEqual({
      slug: 'a',
      label: 'Example A',
      detail: 'Detail A',
      status: 'provisional',
      validFrom: '2026-01-01',
    });
    expect(out[2]).toMatchObject({
      label: '',
      detail: '',
      status: null,
      validFrom: null,
    });
  });

  it('orders equal dates by slug and tolerates empty input', () => {
    const out = listNiggles({
      'niggle:z': { key: 'niggle:z', valid_from: '2026-01-01' },
      'niggle:m': { key: 'niggle:m', valid_from: '2026-01-01' },
      'niggle:n': { key: 'niggle:n' },
      'niggle:o': { key: 'niggle:o' },
    });
    expect(out.map((n) => n.slug)).toEqual(['m', 'z', 'n', 'o']);
    expect(listNiggles(null)).toEqual([]);
    expect(listNiggles({})).toEqual([]);
  });
});
