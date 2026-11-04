// @vitest-environment node
import { gzipSync } from 'node:zlib';

// The worker file assigns self.onmessage at import. Give it a self to talk to
// and a fetch to call, then drive it like the main thread would.
const posted = [];
globalThis.self = {
  postMessage: (msg, transfer) => posted.push({ msg, transfer }),
};

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

beforeEach(() => {
  posted.length = 0;
});

describe('anatomyDecode.worker', () => {
  it('posts progress, decoding once, then transfers the buffer', async () => {
    respond({});
    await self.onmessage({
      data: { url: 'https://x/a.bin', expectedBytes: 1 },
    });
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
    respond({ length: null });
    await self.onmessage({
      data: { url: 'https://x/a.bin', expectedBytes: gz.length * 2 },
    });
    const progress = posted.filter((p) => p.msg.type === 'progress');
    expect(progress[0].msg.total).toBe(gz.length * 2);
  });

  it('reports an HTTP failure as an error message', async () => {
    respond({ ok: false, status: 404 });
    await self.onmessage({
      data: { url: 'https://x/a.bin', expectedBytes: 1 },
    });
    expect(posted).toEqual([
      { msg: { type: 'error', message: 'HTTP 404' }, transfer: undefined },
    ]);
  });
});
