import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DRAFT_KEY,
  saveDraft,
  loadDraft,
  clearDraft,
} from '../strengthDraft.js';

const makeActive = (overrides = {}) => ({
  id: 'workout-123',
  label: 'Lower 1',
  session_type: 'Strength',
  user_id: 'user-abc',
  origin: 'template',
  template_id: 'tpl-1',
  assignment: null,
  started: Date.now(),
  exercises: [
    {
      exercise_id: 'ex-1',
      exercise_name: 'Romanian Deadlift',
      rest_seconds: 150,
      sets: [
        { weight: '65', reps: '8', rpe: '6', warmup: false, done: true },
        { weight: '65', reps: '8', rpe: '7', warmup: false, done: false },
      ],
    },
  ],
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
});

describe('saveDraft', () => {
  it('writes the active object to localStorage', () => {
    const active = makeActive();
    saveDraft(active);
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored.id).toBe('workout-123');
    expect(stored.label).toBe('Lower 1');
    expect(stored.exercises).toHaveLength(1);
  });

  it('does nothing when active is null', () => {
    saveDraft(null);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('does not throw when localStorage.setItem throws QuotaExceededError', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    });
    expect(() => saveDraft(makeActive())).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe('loadDraft', () => {
  it('returns null when key is absent', () => {
    expect(loadDraft()).toBeNull();
  });

  it('returns the parsed object for a valid draft', () => {
    const active = makeActive();
    saveDraft(active);
    const draft = loadDraft();
    expect(draft.id).toBe('workout-123');
    expect(draft.exercises[0].sets[0].done).toBe(true);
  });

  it('returns null and clears key on corrupt JSON', () => {
    localStorage.setItem(DRAFT_KEY, '{not valid json{{');
    expect(loadDraft()).toBeNull();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('returns null and clears key when id is missing', () => {
    const base = makeActive();
    delete base.id;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(base));
    expect(loadDraft()).toBeNull();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('returns null and clears key when label is missing', () => {
    const base = makeActive();
    delete base.label;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(base));
    expect(loadDraft()).toBeNull();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('returns null and clears key when exercises is not an array', () => {
    const bad = { ...makeActive(), exercises: 'not-an-array' };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(bad));
    expect(loadDraft()).toBeNull();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});

describe('clearDraft', () => {
  it('removes the key', () => {
    saveDraft(makeActive());
    clearDraft();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('is idempotent when key does not exist', () => {
    expect(() => clearDraft()).not.toThrow();
  });
});

describe('round-trip', () => {
  it('saveDraft then clearDraft then saveDraft restores correctly', () => {
    const active = makeActive();
    saveDraft(active);
    clearDraft();
    expect(loadDraft()).toBeNull();
    saveDraft(active);
    expect(loadDraft().id).toBe('workout-123');
  });
});
