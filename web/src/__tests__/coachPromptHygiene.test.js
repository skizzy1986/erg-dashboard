import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The in-app Coach's system prompt lives in the edge function, which the web
// suite cannot import (Deno). Read it as text and assert structurally: no
// hard-coded athlete figures, no stale model name, and no server-side context
// builder (the client's buildTrainingContext is the only one).
const repoRoot = join(import.meta.dirname, '../../..');
const source = readFileSync(
  join(repoRoot, 'supabase/functions/coach-chat/index.ts'),
  'utf8'
);

function systemPrompt() {
  const m = source.match(/const COACH_SYSTEM_PROMPT\s*=\s*`([\s\S]*?)`;/);
  return m ? m[1] : null;
}

describe('coach-chat system prompt hygiene', () => {
  it('defines the prompt as a template literal', () => {
    expect(systemPrompt()).not.toBe(null);
  });

  it('carries no hard-coded power, HR, energy or mass figure', () => {
    expect(systemPrompt()).not.toMatch(/\d+\s?(W|bpm|kcal|g)\b/);
  });

  it('names no fixed intensity model', () => {
    expect(systemPrompt()).not.toMatch(/polari/i);
  });

  it('defers to the ATHLETE ANCHORS block the client sends', () => {
    expect(systemPrompt()).toContain('ATHLETE ANCHORS');
  });

  it('does not rebuild training context server-side', () => {
    expect(source).not.toMatch(/\.from\(\s*['"]vitals['"]/);
    expect(source).not.toMatch(/\.from\(\s*['"]anchors['"]/);
  });
});
