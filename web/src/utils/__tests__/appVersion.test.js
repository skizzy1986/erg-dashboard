import { describe, it, expect } from 'vitest';
import { versionLabel } from '../appVersion.js';

describe('versionLabel', () => {
  it('prefixes a semver string with v', () => {
    expect(versionLabel('1.3.0')).toBe('v1.3.0');
  });

  it('returns null for a missing, blank or non-string version', () => {
    for (const v of [undefined, null, '', '  ', 42]) {
      expect(versionLabel(v)).toBeNull();
    }
  });
});
