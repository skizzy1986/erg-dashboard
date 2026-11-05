import { describe, it, expect } from 'vitest';
import {
  splitBody,
  supersededIds,
  toDecisions,
  toHypotheses,
} from '../coachLog.js';

// Synthetic rows only.
describe('splitBody', () => {
  it('splits at the first blank line', () => {
    expect(splitBody('Head line\n\nWhy one\n\nWhy two')).toEqual({
      headline: 'Head line',
      detail: 'Why one\n\nWhy two',
    });
  });

  it('treats a whitespace-only line as blank', () => {
    expect(splitBody('A\n  \nB')).toEqual({ headline: 'A', detail: 'B' });
  });

  it('falls back to the first line without a blank line', () => {
    expect(splitBody('A\nB\nC')).toEqual({ headline: 'A', detail: 'B\nC' });
  });

  it('handles a single line and non-strings', () => {
    expect(splitBody('  only  ')).toEqual({ headline: 'only', detail: '' });
    expect(splitBody(null)).toEqual({ headline: '', detail: '' });
  });
});

describe('supersededIds', () => {
  it('collects every superseded id', () => {
    const ids = supersededIds([
      { id: 1, supersedes: null },
      { id: 2, supersedes: 1 },
      { id: 3 },
    ]);
    expect([...ids]).toEqual([1]);
    expect(supersededIds(null).size).toBe(0);
  });
});

describe('toDecisions', () => {
  it('maps decision rows and flags superseded ones', () => {
    const rows = [
      {
        id: 2,
        date: '2026-01-02',
        entry_type: 'decision',
        body: 'New call\n\nBecause B',
        tags: ['migrated'],
        supersedes: 1,
      },
      {
        id: 1,
        date: '2026-01-01',
        entry_type: 'decision',
        body: 'Old call',
        tags: null,
        supersedes: null,
      },
      { id: 3, entry_type: 'diary', body: 'Diary' },
    ];
    expect(toDecisions(rows)).toEqual([
      {
        id: 2,
        date: '2026-01-02',
        headline: 'New call',
        detail: 'Because B',
        tags: ['migrated'],
        superseded: false,
      },
      {
        id: 1,
        date: '2026-01-01',
        headline: 'Old call',
        detail: '',
        tags: [],
        superseded: true,
      },
    ]);
    expect(toDecisions(undefined)).toEqual([]);
  });
});

describe('toHypotheses', () => {
  it('keeps only the live end of each chain, status from the newest row', () => {
    const rows = [
      {
        id: 11,
        date: '2026-01-03',
        entry_type: 'observation',
        body: 'H1\n\nEvidence now',
        tags: ['hypothesis', 'status:supported'],
        supersedes: 10,
      },
      {
        id: 10,
        date: '2026-01-01',
        entry_type: 'observation',
        body: 'H1\n\nEvidence then',
        tags: ['hypothesis', 'status:open'],
        supersedes: null,
      },
      {
        id: 20,
        date: '2026-01-02',
        entry_type: 'observation',
        body: 'H2',
        tags: ['hypothesis'],
      },
      {
        id: 30,
        entry_type: 'observation',
        body: 'Not a hypothesis',
        tags: ['other'],
      },
      {
        id: 40,
        entry_type: 'decision',
        body: 'Decision tagged hypothesis',
        tags: ['hypothesis'],
      },
      {
        id: 50,
        entry_type: 'observation',
        body: 'H3',
        tags: ['hypothesis', 'status:'],
      },
    ];
    expect(toHypotheses(rows)).toEqual([
      {
        id: 11,
        date: '2026-01-03',
        statement: 'H1',
        status: 'supported',
        evidence: 'Evidence now',
      },
      {
        id: 20,
        date: '2026-01-02',
        statement: 'H2',
        status: 'open',
        evidence: '',
      },
      {
        id: 50,
        date: undefined,
        statement: 'H3',
        status: 'open',
        evidence: '',
      },
    ]);
  });
});
