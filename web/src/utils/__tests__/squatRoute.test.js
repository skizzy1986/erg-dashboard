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
    expect(
      parseSquatHash(
        '#guide=metrics&t=1.60&tab=moments&m=gluteus-maximus&paused'
      )
    ).toEqual({
      guide: 'metrics',
      t: 1.6,
      tab: 'moments',
      m: 'gluteus-maximus',
      paused: true,
    });
  });

  it('returns the empty state for no hash', () => {
    const empty = { guide: null, t: null, tab: null, m: null, paused: false };
    expect(parseSquatHash('')).toEqual(empty);
    expect(parseSquatHash('#')).toEqual(empty);
    expect(parseSquatHash(undefined)).toEqual(empty);
  });

  it('drops unknown panes, tabs, keys and malformed values', () => {
    expect(
      parseSquatHash('#guide=nope&tab=x&t=-1&evil=1&t=abc&guide=%E0%A4%A')
    ).toEqual({ guide: null, t: null, tab: null, m: null, paused: false });
  });

  // Shape only — this module cannot know the 118 names without pulling the
  // tool's chunk into the main entry.
  it.each([
    ['Gluteus-Maximus', 'uppercase'],
    ['soleus!', 'punctuation'],
    ['<img src=x>', 'markup'],
    ['a'.repeat(65), 'over 64 characters'],
    ['', 'empty'],
    ['soleus biceps', 'a space'],
  ])('rejects %s (%s)', (value) => {
    expect(parseSquatHash(`#m=${encodeURIComponent(value)}`).m).toBeNull();
  });

  it('accepts the longest real slug and a digit-bearing one', () => {
    const long = 'flexor-digitorum-superficialis-humeroulnar-head';
    expect(parseSquatHash(`#m=${long}`).m).toBe(long);
    expect(parseSquatHash('#m=abc123').m).toBe('abc123');
  });

  // Deterministic repeats: the later VALID value wins, which is how guide, tab
  // and t already behave in this module.
  it('resolves a repeated m key to the last valid value', () => {
    expect(parseSquatHash('#m=soleus&m=gracilis').m).toBe('gracilis');
    expect(parseSquatHash('#m=soleus&m=NOPE!').m).toBe('soleus');
  });
});

describe('formatSquatHash', () => {
  it('writes keys in a stable order with t to two decimals', () => {
    expect(
      formatSquatHash({
        guide: 'sources',
        t: 1.6,
        tab: 'force',
        m: 'soleus',
        paused: true,
      })
    ).toBe('#guide=sources&t=1.60&tab=force&m=soleus&paused');
  });

  it('writes nothing for an empty or invalid state', () => {
    expect(formatSquatHash({})).toBe('');
    expect(formatSquatHash()).toBe('');
    expect(
      formatSquatHash({ guide: 'bogus', t: NaN, tab: 'nope', m: 'NOPE!' })
    ).toBe('');
    expect(formatSquatHash({ m: null })).toBe('');
  });

  it('round-trips through parse', () => {
    const state = {
      guide: 'method',
      t: 2.45,
      tab: 'len',
      m: 'biceps-femoris-long-head',
      paused: false,
    };
    expect(parseSquatHash(formatSquatHash(state))).toEqual(state);
  });
});
