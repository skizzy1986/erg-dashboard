import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { validateManifest } from '../utils/manifest.js';
import { arrayEntries } from '../../anatomy/utils/arrays.js';
import { DATA_ASSET } from '../constants/dataAsset.js';

const ASSETS = join(process.cwd(), 'src/squat/assets');
const manifest = JSON.parse(
  readFileSync(join(ASSETS, 'squat-manifest.json'), 'utf8')
);

describe('validateManifest', () => {
  const tiny = {
    a: { o: 0, n: 2, t: '<f4' },
    b: { o: 8, n: 4, t: '|u1' },
    meta: { S: [0, 1], readout: [{}, {}] },
  };
  const buf = new ArrayBuffer(16);

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

  it('accepts the real decompressed data', () => {
    const raw = gunzipSync(readFileSync(join(ASSETS, 'squat-anatomy.bin')));
    expect(raw.length).toBe(DATA_ASSET.bin.rawBytes);
    const buffer = raw.buffer.slice(
      raw.byteOffset,
      raw.byteOffset + raw.byteLength
    );
    expect(validateManifest(manifest, buffer)).toBe(
      arrayEntries(manifest).length
    );
  });
});
