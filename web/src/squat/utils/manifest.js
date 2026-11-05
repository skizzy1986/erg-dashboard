import { arrayEntries, viewArray } from '../../anatomy/utils/arrays.js';

// The squat tool's own contract on the manifest: meta.S and meta.readout are
// what the depth slider and the readout tables need, and no other movement is
// obliged to have them. The generic array readers live in anatomy/utils.

/**
 * Structural checks a broken or mismatched download would fail. Returns the
 * number of arrays checked; throws with the first problem found.
 */
export function validateManifest(manifest, buffer) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('The manifest is not an object.');
  }
  const meta = manifest.meta;
  if (!meta || !Array.isArray(meta.S) || !Array.isArray(meta.readout)) {
    throw new Error('The manifest has no usable meta.');
  }
  if (meta.readout.length !== meta.S.length) {
    throw new Error('The manifest readout does not match its depth samples.');
  }
  const entries = arrayEntries(manifest);
  if (!entries.length) throw new Error('The manifest lists no arrays.');
  if (buffer) for (const [name] of entries) viewArray(manifest, buffer, name);
  return entries.length;
}
