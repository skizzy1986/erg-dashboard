// Thin worker shell: fetch, count, gunzip off the main thread, hand the buffer
// back as a transfer (no copy). All logic is in decodeStream.js.
//
// The worker owns its URL: it fetches only the bundled anatomy asset, never an
// address handed to it in a message, and answers only same-origin senders.
import { decodeStream } from './decodeStream.js';
import dataUrl from '../assets/squat-anatomy.bin?url';
import { DATA_ASSET } from '../constants/dataAsset.js';

self.onmessage = async (event) => {
  // A dedicated worker's messages carry an empty origin; anything else is not
  // from the page that created it.
  if (event.origin && event.origin !== self.location.origin) return;
  if (event.data?.type !== 'start') return;
  const expectedBytes = DATA_ASSET.bin.bytes;
  try {
    const res = await fetch(new URL(dataUrl, self.location.href));
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
