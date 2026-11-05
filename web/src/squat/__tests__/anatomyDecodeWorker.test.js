// @vitest-environment node
import { gzipSync } from 'node:zlib';

// The worker file assigns self.onmessage at import. Give it a self to talk to
// and a fetch to call, then drive it like the main thread would.
const posted = [];
globalThis.self = {
  postMessage: (msg, transfer) => posted.push({ msg, transfer }),
  location: {
    href: 'https://splitiq.test/assets/w.js',
    origin: 'https://splitiq.test',
  },
};
const START = { origin: '', data: { type: 'start' } };

const plain = new Uint8Array(4000).map((_, i) => i % 251);
const gz = new Uint8Array(gzipSync(plain));

function respond({ ok = true, status = 200, length = gz.length, body = gz }) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    headers: { get: () => (length == null ? null : String(length)) },
    body: ok
      ? new ReadableStream({
          start(c) {
            for (let i = 0; i < body.length; i += 50)
              c.enqueue(body.slice(i, i + 50));
            c.close();
          },
        })
      : null,
  });
}

await import('../workers/anatomyDecode.worker.js');
const { DATA_ASSET } = await import('../constants/dataAsset.js');

beforeEach(() => {
  posted.length = 0;
});

describe('anatomyDecode.worker', () => {
  it('fetches only its own bundled asset, same-origin', async () => {
    respond({});
    await self.onmessage(START);
    const target = fetch.mock.calls[0][0];
    expect(target).toBeInstanceOf(URL);
    expect(target.origin).toBe('https://splitiq.test');
    expect(target.pathname).toMatch(/squat-anatomy.*\.bin$/);
  });

  it('ignores messages from another origin, or that are not a start', async () => {
    respond({});
    await self.onmessage({
      origin: 'https://evil.test',
      data: { type: 'start' },
    });
    await self.onmessage({ origin: '', data: { url: 'https://evil.test/x' } });
    expect(fetch).not.toHaveBeenCalled();
    expect(posted).toEqual([]);
  });

  it('posts progress, decoding once, then transfers the buffer', async () => {
    respond({});
    await self.onmessage(START);
    const types = posted.map((p) => p.msg.type);
    expect(types.filter((t) => t === 'decoding')).toHaveLength(1);
    expect(types.at(-1)).toBe('done');
    const progress = posted.filter((p) => p.msg.type === 'progress');
    expect(progress.at(-1).msg).toEqual({
      type: 'progress',
      loaded: gz.length,
      total: gz.length,
    });
    const done = posted.at(-1);
    expect(done.transfer).toEqual([done.msg.buffer]);
    expect(new Uint8Array(done.msg.buffer)).toEqual(plain);
  });

  it('falls back to the build-time length without Content-Length', async () => {
    // Incompressible, so the stream is long enough to cross one 1% step of the
    // real 2.2 MB denominator.
    let x = 7;
    const noise = new Uint8Array(60000).map(
      () => (x = (Math.imul(x, 1103515245) + 12345) >>> 0) >>> 24
    );
    respond({ length: null, body: new Uint8Array(gzipSync(noise)) });
    await self.onmessage(START);
    const progress = posted.filter((p) => p.msg.type === 'progress');
    expect(progress[0].msg.total).toBe(DATA_ASSET.bin.bytes);
  });

  it('reports an HTTP failure as an error message', async () => {
    respond({ ok: false, status: 404 });
    await self.onmessage(START);
    expect(posted).toEqual([
      { msg: { type: 'error', message: 'HTTP 404' }, transfer: undefined },
    ]);
  });
});
