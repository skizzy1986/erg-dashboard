// Thin worker shell: fetch, count, gunzip off the main thread, hand the buffer
// back as a transfer (no copy). All logic is in decodeStream.js.
import { decodeStream } from './decodeStream.js';

self.onmessage = async ({ data }) => {
  const { url, expectedBytes } = data;
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const header = Number(res.headers.get('Content-Length'));
    const total = header > 0 ? header : expectedBytes;
    let last = 0;
    let decoding = false;
    const buffer = await decodeStream(res.body, total, (loaded) => {
      // ~1% steps; a message per network chunk floods the main thread.
      if (loaded - last >= total / 100 || loaded >= total) {
        last = loaded;
        self.postMessage({ type: 'progress', loaded, total });
      }
      if (!decoding && loaded >= total) {
        decoding = true;
        self.postMessage({ type: 'decoding' });
      }
    });
    self.postMessage({ type: 'done', buffer }, [buffer]);
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: String(error?.message || error),
    });
  }
};
