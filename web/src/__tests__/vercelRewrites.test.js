import config from '../../vercel.json';

// vercel.json's routing, as Vercel applies it: the filesystem first, then
// rewrites in order with the first match winning (Vercel docs, "Rule ordering"
// and the vercel.json reference: "the filesystem takes precedence over
// rewrites"). Every source here is a plain regex path, so it maps 1:1.
const STATIC_FILES = new Set([
  '/assets/index-abc.js',
  '/assets/squat-anatomy-abc.bin',
  '/registerSW.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
]);
const toRegex = (source) => new RegExp(`^${source}$`);

function resolve(path) {
  if (STATIC_FILES.has(path)) return path;
  for (const { source, destination } of config.rewrites) {
    const m = path.match(toRegex(source));
    if (m) return destination.replace(/\$(\d)/g, (_, i) => m[Number(i)]);
  }
  return path;
}

const headersFor = (path) =>
  Object.fromEntries(
    config.headers
      .filter(({ source }) => toRegex(source).test(path))
      .flatMap(({ headers }) => headers.map((h) => [h.key, h.value]))
  );

describe('vercel.json routing for /squat/', () => {
  it('has no redirect on /squat — a client replaceState canonicalises it', () => {
    const redirects = config.redirects ?? [];
    expect(redirects.filter((r) => r.source.startsWith('/squat'))).toEqual([]);
  });

  it('keeps the SPA catch-all last, so the /squat/ rules can match first', () => {
    const last = config.rewrites.at(-1);
    expect(last).toEqual({ source: '/(.*)', destination: '/' });
    expect(
      config.rewrites.slice(0, -1).every((r) => r.source.startsWith('/squat/'))
    ).toBe(true);
  });

  it.each([
    ['/squat/assets/index-abc.js', '/assets/index-abc.js'],
    ['/squat/assets/squat-anatomy-abc.bin', '/assets/squat-anatomy-abc.bin'],
    ['/squat/registerSW.js', '/registerSW.js'],
    ['/squat/manifest.webmanifest', '/manifest.webmanifest'],
    ['/squat/icons/icon-192.png', '/icons/icon-192.png'],
    ['/squat/', '/'],
    ['/squat', '/'],
    ['/assets/index-abc.js', '/assets/index-abc.js'],
  ])('%s is served from %s', (path, served) => {
    expect(resolve(path)).toBe(served);
  });

  it('gives the rewritten asset paths the same headers as /assets/', () => {
    for (const name of ['index-abc.js', 'squat-anatomy-abc.bin']) {
      const direct = headersFor(`/assets/${name}`);
      expect(headersFor(`/squat/assets/${name}`)).toEqual(direct);
    }
    expect(
      headersFor('/squat/assets/squat-anatomy-abc.bin')['Content-Type']
    ).toBe('application/octet-stream');
  });
});
