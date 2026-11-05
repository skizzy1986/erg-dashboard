import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import {
  arrayEntries,
  DTYPES,
  validateManifest,
  viewArray,
} from '../utils/manifest.js';
import { dequantise } from '../utils/dequantise.js';
import { DATA_ASSET } from '../constants/dataAsset.js';

const ASSETS = join(process.cwd(), 'src/squat/assets');
const manifest = JSON.parse(
  readFileSync(join(ASSETS, 'squat-manifest.json'), 'utf8')
);

describe('manifest utilities', () => {
  const tiny = {
    a: { o: 0, n: 2, t: '<f4' },
    b: { o: 8, n: 4, t: '|u1' },
    meta: { S: [0, 1], readout: [{}, {}] },
  };
  const buf = new ArrayBuffer(16);

  it('maps every dtype the pipeline writes', () => {
    expect(Object.keys(DTYPES).sort()).toEqual(
      ['<f4', '<i2', '<u2', '<u4', '|i1', '|u1'].sort()
    );
  });

  it('views an array without copying', () => {
    const a = viewArray(tiny, buf, 'a');
    expect(a).toBeInstanceOf(Float32Array);
    expect(a.buffer).toBe(buf);
    expect(a.length).toBe(2);
  });

  it('rejects a missing name, a bad dtype, misalignment and overrun', () => {
    expect(() => viewArray(tiny, buf, 'meta')).toThrow(/No array/);
    expect(() => viewArray({ x: { o: 0, n: 1, t: '<f8' } }, buf, 'x')).toThrow(
      /unknown dtype/
    );
    expect(() => viewArray({ x: { o: 2, n: 1, t: '<f4' } }, buf, 'x')).toThrow(
      /misaligned/
    );
    expect(() => viewArray({ x: { o: 8, n: 4, t: '<f4' } }, buf, 'x')).toThrow(
      /past the end/
    );
  });

  it('validates structure, with and without a buffer', () => {
    expect(validateManifest(tiny)).toBe(2);
    expect(validateManifest(tiny, buf)).toBe(2);
    expect(() => validateManifest(null)).toThrow(/not an object/);
    expect(() => validateManifest({})).toThrow(/no usable meta/);
    expect(() =>
      validateManifest({ meta: { S: [0, 1], readout: [{}] } })
    ).toThrow(/does not match/);
    expect(() => validateManifest({ meta: { S: [0], readout: [{}] } })).toThrow(
      /lists no arrays/
    );
  });

  it('indexes the real decompressed data exactly', () => {
    const raw = gunzipSync(readFileSync(join(ASSETS, 'squat-anatomy.bin')));
    expect(raw.length).toBe(DATA_ASSET.bin.rawBytes);
    const buffer = raw.buffer.slice(
      raw.byteOffset,
      raw.byteOffset + raw.byteLength
    );
    expect(validateManifest(manifest, buffer)).toBe(
      arrayEntries(manifest).length
    );
    const frames = viewArray(manifest, buffer, 'frames');
    expect(frames.length).toBe(41 * 11 * 7);
  });

  it('dequantises int16 positions per axis', () => {
    const out = dequantise(
      new Int16Array([1, 2, 3, -1, 0, 1]),
      [10, 20, 30],
      0.5
    );
    expect([...out]).toEqual([10.5, 21, 31.5, 9.5, 20, 30.5]);
  });
});
