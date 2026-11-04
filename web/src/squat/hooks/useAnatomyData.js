import { useCallback, useEffect, useState } from 'react';
import { captureError } from '../../utils/sentry.js';
import { createAnatomyWorker } from '../workers/createAnatomyWorker.js';
import { validateManifest } from '../utils/manifest.js';
import { summariseRep } from '../utils/repSummary.js';
import { DATA_ASSET } from '../constants/dataAsset.js';

export const OFFLINE_MESSAGE = '3D view needs a connection the first time.';
export const FAILED_MESSAGE =
  'The anatomy data could not be loaded. Check your connection and try again.';

const INITIAL = {
  stage: 'fetching',
  loaded: 0,
  total: DATA_ASSET.bin.bytes,
  manifest: null,
  summary: null,
  buffer: null,
  error: null,
};

const isOffline = () =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

const absolute = (url) => new URL(url, document.baseURI).href;

/**
 * Loads the tool's data in two steps. The manifest (~100 KB of JSON) comes
 * first and carries every number the guide and form check print, so those are
 * ready long before the 2.2 MB anatomy stream. The stream is fetched and
 * gunzipped in a worker.
 *
 * stage: fetching → decoding → building → ready, or error, or `unsupported`
 * (no WebGL, DecompressionStream or Worker — the manifest still loads, the 3D
 * data does not, and the caller says so).
 */
export function useAnatomyData({
  manifestUrl,
  dataUrl,
  capabilities,
  createWorker = createAnatomyWorker,
}) {
  const [state, setState] = useState(INITIAL);
  const [attempt, setAttempt] = useState(0);
  // No point streaming 2.2 MB into a browser that cannot show or unpack it.
  const canDecode =
    capabilities.webgl && capabilities.decompression && capabilities.worker;

  useEffect(() => {
    let cancelled = false;
    let worker = null;
    const controller = new window.AbortController();
    // A worker has one job; once it reports done or fails it is let go rather
    // than held until unmount.
    const release = () => {
      worker?.terminate();
      worker = null;
    };
    const patch = (p) => {
      if (!cancelled) setState((s) => ({ ...s, ...p }));
    };
    const fail = (error, stage) => {
      if (cancelled) return;
      captureError(error, { where: 'useAnatomyData', stage, attempt });
      patch({
        stage: 'error',
        error: isOffline() ? OFFLINE_MESSAGE : FAILED_MESSAGE,
      });
    };

    (async () => {
      let manifest;
      try {
        const res = await fetch(manifestUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`);
        manifest = await res.json();
        validateManifest(manifest);
        patch({ manifest, summary: summariseRep(manifest.meta) });
      } catch (error) {
        // An abort is the effect's own cleanup, not a failure to report.
        if (error?.name === 'AbortError') return;
        fail(error, 'manifest');
        return;
      }
      if (cancelled) return;
      if (!canDecode) {
        patch({ stage: 'unsupported' });
        return;
      }

      worker = createWorker();
      worker.onmessage = ({ data }) => {
        if (data.type === 'progress') {
          patch({ loaded: data.loaded, total: data.total });
        } else if (data.type === 'decoding') {
          patch({ stage: 'decoding' });
        } else if (data.type === 'done') {
          release();
          patch({ stage: 'building' });
          // A tick so "Building model" paints before the synchronous check.
          setTimeout(() => {
            if (cancelled) return;
            try {
              validateManifest(manifest, data.buffer);
              patch({ stage: 'ready', buffer: data.buffer });
            } catch (error) {
              fail(error, 'building');
            }
          }, 0);
        } else if (data.type === 'error') {
          release();
          fail(new Error(data.message), 'download');
        }
      };
      worker.onerror = (event) => {
        event?.preventDefault?.();
        release();
        fail(new Error(event?.message || 'Anatomy worker failed'), 'worker');
      };
      worker.postMessage({
        url: absolute(dataUrl),
        expectedBytes: DATA_ASSET.bin.bytes,
      });
    })();

    return () => {
      cancelled = true;
      controller.abort();
      release();
    };
  }, [manifestUrl, dataUrl, canDecode, createWorker, attempt]);

  const retry = useCallback(() => {
    setState(INITIAL);
    setAttempt((n) => n + 1);
  }, []);
  return { ...state, retry };
}
