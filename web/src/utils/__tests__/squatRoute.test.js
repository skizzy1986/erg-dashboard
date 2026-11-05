import {
  canonicalSquatUrl,
  formatSquatHash,
  isSquatPath,
  parseSquatHash,
} from '../squatRoute.js';

describe('canonicalSquatUrl', () => {
  it('drops the trailing slash and keeps query and hash', () => {
    expect(
      canonicalSquatUrl({
        pathname: '/squat/',
        search: '?a=1',
        hash: '#paused',
      })
    ).toBe('/squat?a=1#paused');
    expect(canonicalSquatUrl({ pathname: '/squat/' })).toBe('/squat');
  });
  it('leaves every other path alone', () => {
    expect(canonicalSquatUrl({ pathname: '/squat' })).toBeNull();
    expect(canonicalSquatUrl({ pathname: '/' })).toBeNull();
  });
});

describe('isSquatPath', () => {
  it('matches /squat with and without the trailing slash', () => {
    expect(isSquatPath('/squat')).toBe(true);
    expect(isSquatPath('/squat/')).toBe(true);
  });

  it('does not match the dashboard or look-alikes', () => {
    expect(isSquatPath('/')).toBe(false);
    expect(isSquatPath('/squats')).toBe(false);
    expect(isSquatPath('/squat/extra')).toBe(false);
    expect(isSquatPath('/SQUAT')).toBe(false);
  });
});

describe('parseSquatHash', () => {
  it('reads every supported key', () => {
    expect(parseSquatHash('#guide=metrics&t=1.60&tab=moments&paused')).toEqual({
      guide: 'metrics',
      t: 1.6,
      tab: 'moments',
      paused: true,
    });
  });

  it('returns the empty state for no hash', () => {
    const empty = { guide: null, t: null, tab: null, paused: false };
    expect(parseSquatHash('')).toEqual(empty);
    expect(parseSquatHash('#')).toEqual(empty);
    expect(parseSquatHash(undefined)).toEqual(empty);
  });

  it('drops unknown panes, tabs, keys and malformed values', () => {
    expect(
      parseSquatHash('#guide=nope&tab=x&t=-1&evil=1&t=abc&guide=%E0%A4%A')
    ).toEqual({ guide: null, t: null, tab: null, paused: false });
  });
});

describe('formatSquatHash', () => {
  it('writes keys in a stable order with t to two decimals', () => {
    expect(
      formatSquatHash({ guide: 'sources', t: 1.6, tab: 'force', paused: true })
    ).toBe('#guide=sources&t=1.60&tab=force&paused');
  });

  it('writes nothing for an empty or invalid state', () => {
    expect(formatSquatHash({})).toBe('');
    expect(formatSquatHash()).toBe('');
    expect(formatSquatHash({ guide: 'bogus', t: NaN, tab: 'nope' })).toBe('');
  });

  it('round-trips through parse', () => {
    const state = { guide: 'method', t: 2.45, tab: 'len', paused: false };
    expect(parseSquatHash(formatSquatHash(state))).toEqual(state);
  });
});
