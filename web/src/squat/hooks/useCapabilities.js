import { useState } from 'react';

// What this browser can do, read once. Each probe is defensive: a missing API
// is an answer ("no"), never a crash, because everything except the 3D view
// still has to render.
export function detectCapabilities(win = globalThis) {
  let webgl;
  try {
    const canvas = win.document?.createElement('canvas');
    const gl =
      canvas?.getContext?.('webgl2') || canvas?.getContext?.('webgl') || null;
    webgl = !!gl;
    // Give the context back now; browsers cap how many can be alive at once.
    gl?.getExtension?.('WEBGL_lose_context')?.loseContext();
  } catch {
    // A throwing getContext is a "no", not an error to report.
    webgl = false;
  }
  return {
    webgl,
    decompression: typeof win.DecompressionStream === 'function',
    worker: typeof win.Worker === 'function',
  };
}

export function useCapabilities(probe = detectCapabilities) {
  const [caps] = useState(() => probe());
  return caps;
}
