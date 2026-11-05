// Generic readers for the manifest that indexes a decompressed anatomy buffer.
// Every array entry is { o: byte offset, n: element count, t: numpy dtype code,
// shape? }; everything else (meta, st_meta, sa_meta) is plain data. Movement-
// neutral: the squat tool's own structural contract lives in squat/utils.

export const DTYPES = {
  '<i2': Int16Array,
  '|u1': Uint8Array,
  '<u2': Uint16Array,
  '<u4': Uint32Array,
  '<f4': Float32Array,
  '|i1': Int8Array,
};

export const isArrayEntry = (e) =>
  !!e && typeof e === 'object' && 'o' in e && 't' in e && 'n' in e;

export function arrayEntries(manifest) {
  return Object.entries(manifest).filter(([, e]) => isArrayEntry(e));
}

/** A typed view onto `buffer` — no copy. Throws on a bad dtype or bounds. */
export function viewArray(manifest, buffer, name) {
  const e = manifest[name];
  if (!isArrayEntry(e)) throw new Error(`No array "${name}" in the manifest.`);
  const T = DTYPES[e.t];
  if (!T) throw new Error(`Array "${name}" has unknown dtype ${e.t}.`);
  if (e.o % T.BYTES_PER_ELEMENT !== 0) {
    throw new Error(`Array "${name}" is misaligned for ${e.t}.`);
  }
  if (e.o + e.n * T.BYTES_PER_ELEMENT > buffer.byteLength) {
    throw new Error(`Array "${name}" runs past the end of the data.`);
  }
  return new T(buffer, e.o, e.n);
}
