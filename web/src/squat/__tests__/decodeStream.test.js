// @vitest-environment node
import { gzipSync } from 'node:zlib';
import { decodeStream } from '../workers/decodeStream.js';

const streamOf = (bytes, chunk = 7) =>
  new ReadableStream({
    start(c) {
      for (let i = 0; i < bytes.length; i += chunk) {
        c.enqueue(bytes.slice(i, i + chunk));
      }
      c.close();
    },
  });

describe('decodeStream', () => {
  const plain = new TextEncoder().encode('squat '.repeat(500));
  const gz = new Uint8Array(gzipSync(plain));

  it('gunzips a streamed body and reports byte progress', async () => {
    const seen = [];
    const out = await decodeStream(streamOf(gz), gz.length, (l, t) =>
      seen.push([l, t])
    );
    expect(new Uint8Array(out)).toEqual(plain);
    expect(seen.at(-1)).toEqual([gz.length, gz.length]);
    expect(seen.length).toBe(Math.ceil(gz.length / 7));
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i][0]).toBeGreaterThan(seen[i - 1][0]);
    }
  });

  it('works without a progress callback', async () => {
    const out = await decodeStream(streamOf(gz, 64), gz.length);
    expect(out.byteLength).toBe(plain.length);
  });

  it('rejects a body that is not gzip', async () => {
    await expect(
      decodeStream(streamOf(new Uint8Array([1, 2, 3, 4, 5])), 5)
    ).rejects.toBeTruthy();
  });

  it('rejects a body that fails mid-download', async () => {
    const broken = new ReadableStream({
      start(c) {
        c.enqueue(gz.slice(0, 10));
        c.error(new Error('network'));
      },
    });
    await expect(decodeStream(broken, gz.length)).rejects.toThrow('network');
  });

  it('explains when the browser has no DecompressionStream', async () => {
    const original = globalThis.DecompressionStream;
    globalThis.DecompressionStream = undefined;
    try {
      await expect(decodeStream(streamOf(gz), gz.length)).rejects.toThrow(
        /DecompressionStream is not available/
      );
    } finally {
      globalThis.DecompressionStream = original;
    }
  });
});
