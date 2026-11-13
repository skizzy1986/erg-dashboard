import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

// /squat will mount the same language machinery (PR-2) and must never pull
// supabaseClient.js in with it: its createClient() runs at import.
// RouteRoot.test.jsx proves it at runtime; this proves it at the source.
const DIR = join(cwd(), 'src', 'i18n');

describe('the language modules', () => {
  it('never import the Supabase client', () => {
    const files = readdirSync(DIR).filter((f) => /\.(js|jsx)$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(readFileSync(join(DIR, f), 'utf8'), f).not.toMatch(
        /supabaseClient/
      );
    }
  });
});
