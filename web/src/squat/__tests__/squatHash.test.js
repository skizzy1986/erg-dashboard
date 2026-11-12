import {
  CAM_LIMITS,
  camToPose,
  formatSquatHash,
  parseSquatHash,
  poseToCam,
  shareState,
  shareUrl,
  T_MAX,
} from '../utils/squatHash.js';
import { SCENE_STYLE } from '../../anatomy/constants/sceneStyle.js';
import { degreeLimits } from '../../anatomy/utils/cameraPose.js';

const EMPTY = {
  guide: null,
  t: null,
  tab: null,
  m: null,
  paused: false,
  cam: null,
  hide: null,
  heat: false,
};

// Moved from utils/__tests__/squatRoute.test.js with the module (R11, #439).
// Only the empty state grew: it now carries the three R11 keys.
describe('parseSquatHash', () => {
  it('reads every supported key', () => {
    expect(
      parseSquatHash(
        '#guide=metrics&t=1.60&tab=moments&m=gluteus-maximus&paused'
      )
    ).toEqual({
      ...EMPTY,
      guide: 'metrics',
      t: 1.6,
      tab: 'moments',
      m: 'gluteus-maximus',
      paused: true,
    });
  });

  it('returns the empty state for no hash', () => {
    expect(parseSquatHash('')).toEqual(EMPTY);
    expect(parseSquatHash('#')).toEqual(EMPTY);
    expect(parseSquatHash(undefined)).toEqual(EMPTY);
  });

  it('drops unknown panes, tabs, keys and malformed values', () => {
    expect(
      parseSquatHash('#guide=nope&tab=x&t=-1&evil=1&t=abc&guide=%E0%A4%A')
    ).toEqual(EMPTY);
  });

  // Shape only: the tool resolves the slug against the manifest itself.
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
      ...EMPTY,
      guide: 'method',
      t: 2.45,
      tab: 'len',
      m: 'biceps-femoris-long-head',
      paused: false,
    };
    expect(parseSquatHash(formatSquatHash(state))).toEqual(state);
  });
});

// ── R11: the share-a-view grammar ───────────────────────────────────────

const reformat = (h) => formatSquatHash(parseSquatHash(h));

describe('the camera key (criterion 7)', () => {
  it('limits are the scene’s own, the same in both themes', () => {
    expect(SCENE_STYLE.dark.camera).toBe(SCENE_STYLE.light.camera);
    expect(degreeLimits(CAM_LIMITS)).toEqual({
      minPol: 9,
      maxPol: 92,
      minDist: 0.6,
      maxDist: 6,
    });
  });

  it.each([
    ['90,85,2.50', { az: 90, pol: 85, dist: 2.5 }],
    ['540,85,2.5', { az: 180, pol: 85, dist: 2.5 }],
    ['-180,85,2.5', { az: 180, pol: 85, dist: 2.5 }],
    ['-181,85,2.5', { az: 179, pol: 85, dist: 2.5 }],
    ['10.6,10.4,1.006', { az: 11, pol: 10, dist: 1.01 }],
    ['0,0,3', { az: 0, pol: 9, dist: 3 }],
    ['0,200,3', { az: 0, pol: 92, dist: 3 }],
    ['0,45,0.1', { az: 0, pol: 45, dist: 0.6 }],
    ['0,45,99', { az: 0, pol: 45, dist: 6 }],
  ])('cleans cam=%s', (value, cam) => {
    expect(parseSquatHash(`#cam=${value}`).cam).toEqual(cam);
  });

  it.each([
    'abc',
    '',
    '1,2',
    '1,2,3,4',
    '10,200,abc',
    '10,-5,1',
    'NaN,1,1',
    'Infinity,1,1',
    '1e999,1,1',
    '12345,1,1',
    '1,1,123',
    '-,1,1',
    '1,,1',
  ])('ignores the whole key for cam=%s, and never throws', (value) => {
    expect(() => parseSquatHash(`#cam=${value}`)).not.toThrow();
    expect(parseSquatHash(`#cam=${value}`).cam).toBeNull();
  });

  it('a repeated cam key resolves to the last valid one', () => {
    expect(parseSquatHash('#cam=10,10,1&cam=bad').cam).toEqual({
      az: 10,
      pol: 10,
      dist: 1,
    });
    expect(parseSquatHash('#cam=10,10,1&cam=20,20,2').cam.az).toBe(20);
  });

  it('formats a cleaned cam, and drops one with a non-finite field', () => {
    expect(formatSquatHash({ cam: { az: 540, pol: 200, dist: 99 } })).toBe(
      '#cam=180,92,6.00'
    );
    expect(formatSquatHash({ cam: { az: NaN, pol: 10, dist: 1 } })).toBe('');
    expect(formatSquatHash({ cam: null })).toBe('');
  });

  it('converts between the degree key and a radian pose, both ways', () => {
    const pose = camToPose({ az: 90, pol: 85, dist: 2.5 });
    expect(pose.azimuth).toBeCloseTo(Math.PI / 2, 12);
    expect(pose.polar).toBeCloseTo((85 * Math.PI) / 180, 12);
    expect(pose.radius).toBe(2.5);
    expect(poseToCam(pose)).toEqual({ az: 90, pol: 85, dist: 2.5 });
    expect(camToPose(null)).toBeNull();
    expect(poseToCam(null)).toBeNull();
  });
});

describe('layers, heatmap and time', () => {
  it('reads hide as a closed set, deduplicated, in a fixed order', () => {
    expect(parseSquatHash('#hide=skeleton').hide).toEqual(['skeleton']);
    expect(parseSquatHash('#hide=skeleton,muscles,muscles').hide).toEqual([
      'muscles',
      'skeleton',
    ]);
    expect(parseSquatHash('#hide=bogus').hide).toBeNull();
    expect(parseSquatHash('#hide=').hide).toBeNull();
    expect(parseSquatHash('#hide=muscles&hide=bogus').hide).toEqual([
      'muscles',
    ]);
    expect(formatSquatHash({ hide: ['skeleton', 'body', 'muscles'] })).toBe(
      '#hide=muscles,skeleton'
    );
    expect(formatSquatHash({ hide: [] })).toBe('');
  });

  it('reads heat bare or as heat=1, and ignores any other value', () => {
    expect(parseSquatHash('#heat').heat).toBe(true);
    expect(parseSquatHash('#heat=1').heat).toBe(true);
    expect(parseSquatHash('#heat=0').heat).toBe(false);
    expect(parseSquatHash('#heat=yes').heat).toBe(false);
    expect(formatSquatHash({ heat: true })).toBe('#heat');
  });

  it('caps t at T_MAX, so a huge time clamps rather than vanishing', () => {
    expect(T_MAX).toBe(600);
    expect(parseSquatHash(`#t=${'9'.repeat(400)}`).t).toBe(600);
    expect(parseSquatHash('#t=601').t).toBe(600);
    expect(parseSquatHash('#t=99').t).toBe(99);
    expect(formatSquatHash({ t: 1e9 })).toBe('#t=600.00');
  });

  it('emits all eight keys in the pinned order', () => {
    expect(
      formatSquatHash({
        heat: true,
        hide: ['skeleton'],
        cam: { az: 1, pol: 50, dist: 2 },
        paused: true,
        m: 'soleus',
        tab: 'force',
        t: 1,
        guide: 'method',
      })
    ).toBe(
      '#guide=method&t=1.00&tab=force&m=soleus&paused&cam=1,50,2.00&hide=skeleton&heat'
    );
  });
});

describe('fixed point: the cleaned value is what gets re-emitted', () => {
  // A deterministic corpus: every key, valid and not, glued at random.
  function corpus(n) {
    let seed = 0x5eed;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const num = () =>
      pick([
        '',
        '-',
        'x',
        String(Math.round(rnd() * 2000 - 1000)),
        (rnd() * 400 - 200).toFixed(pick([0, 1, 3])),
        '9'.repeat(30),
      ]);
    const parts = [
      () => `t=${num()}`,
      () => `cam=${num()},${num()},${num()}`,
      () =>
        `hide=${pick(['muscles', 'skeleton', 'bogus', ''])},${pick(['muscles', 'skeleton'])}`,
      () => pick(['heat', 'heat=1', 'heat=0', 'paused', 'paused=no']),
      () => `m=${pick(['soleus', 'NOPE', '', 'a-b-1'])}`,
      () => `guide=${pick(['metrics', 'nope'])}`,
      () => `tab=${pick(['len', 'x'])}`,
      () => `${pick(['foo', '%E0%A4%A', 'cam'])}=${num()}`,
    ];
    return Array.from({ length: n }, () =>
      Array.from({ length: 1 + Math.floor(rnd() * 6) }, () => pick(parts)())
        .map((f) => f)
        .join('&')
    ).map((h) => `#${h}`);
  }

  it.each(corpus(200))('%s', (h) => {
    expect(() => parseSquatHash(h)).not.toThrow();
    const once = reformat(h);
    expect(reformat(once)).toBe(once);
  });

  // The mixed corpus above rarely forms a camera the grammar accepts, so the
  // clamp-and-round path gets its own corpus of grammar-valid triples.
  function validCams(n) {
    let seed = 0xca3;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const num = (max) => {
      const whole = String(Math.floor(rnd() * (max + 1)));
      const places = Math.floor(rnd() * 5);
      return places
        ? `${whole}.${String(Math.floor(rnd() * 10 ** places)).padStart(places, '0')}`
        : whole;
    };
    return Array.from(
      { length: n },
      () => `#cam=${rnd() < 0.5 ? '-' : ''}${num(9999)},${num(999)},${num(99)}`
    );
  }

  it.each(validCams(200))('%s', (h) => {
    const cam = parseSquatHash(h).cam;
    expect(cam).not.toBeNull();
    const once = reformat(h);
    expect(once).toMatch(/^#cam=-?\d+,\d+,\d+\.\d{2}$/);
    expect(reformat(once)).toBe(once);
    expect(parseSquatHash(once).cam).toEqual(cam);
  });
});

describe('shareState and shareUrl (criteria 5, 13)', () => {
  const VIEW = {
    frame: 0,
    t: 0,
    layers: { muscles: true, skeleton: true },
    heatmap: false,
  };
  const url = (over) => shareUrl('https://x', shareState({ ...VIEW, ...over }));

  it('an untouched view is bare /squat, with no query string ever', () => {
    expect(url({})).toBe('https://x/squat');
    expect(
      url({ scenePose: { radius: 3, polar: 1, azimuth: 0, home: true } })
    ).toBe('https://x/squat');
    expect(url({ frame: 3, t: 0.06 })).not.toContain('?');
  });

  it('carries t and paused only off frame 0, and never the guide', () => {
    expect(url({ frame: 0, t: 0 })).toBe('https://x/squat');
    expect(url({ frame: 122, t: 2.44 })).toBe('https://x/squat#t=2.44&paused');
    expect(shareState({ ...VIEW }).guide).toBeNull();
  });

  it('passes m and tab through', () => {
    expect(url({ m: 'soleus', tab: 'act' })).toBe(
      'https://x/squat#tab=act&m=soleus'
    );
  });

  it('reads the camera from the scene, else carries the link’s', () => {
    const pose = camToPose({ az: -90, pol: 80, dist: 2 });
    expect(url({ scenePose: { ...pose, home: false } })).toBe(
      'https://x/squat#cam=-90,80,2.00'
    );
    expect(
      url({
        scenePose: { ...pose, home: true },
        carriedCam: { az: 1, pol: 50, dist: 2 },
      })
    ).toBe('https://x/squat');
    expect(url({ carriedCam: { az: 1, pol: 50, dist: 2 } })).toBe(
      'https://x/squat#cam=1,50,2.00'
    );
  });

  it('carries the layers that are off and the heatmap when on', () => {
    expect(
      url({ layers: { muscles: false, skeleton: false }, heatmap: true })
    ).toBe('https://x/squat#hide=muscles,skeleton&heat');
    expect(url({ layers: undefined })).toBe('https://x/squat');
  });

  it('has no input a filter or any free text could ride in on', () => {
    const state = shareState({ ...VIEW, query: 'glutes', search: '?a=1' });
    expect(Object.keys(state).sort()).toEqual(Object.keys(EMPTY).sort());
    expect(shareUrl('https://x', state)).toBe('https://x/squat');
  });
});
