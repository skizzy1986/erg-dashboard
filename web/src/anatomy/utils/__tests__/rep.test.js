import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { directionAt, frameAt, repInfo, timeAt } from '../rep.js';

const manifest = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/squat/assets/squat-manifest.json'),
    'utf8'
  )
);
const rep = manifest.meta.rep;
const info = repInfo(rep, 5);

describe('repInfo', () => {
  it('rejects anything it cannot index safely', () => {
    const ok = { dt: 0.02, s: [0, 1, 0], ph: [0, 1, 1] };
    expect(repInfo(ok, 2)).not.toBeNull();
    expect(repInfo(null, 2)).toBeNull();
    expect(repInfo('rep', 2)).toBeNull();
    expect(repInfo({ ...ok, dt: undefined }, 2)).toBeNull();
    expect(repInfo({ ...ok, dt: 0 }, 2)).toBeNull();
    expect(repInfo({ ...ok, s: undefined }, 2)).toBeNull();
    expect(repInfo({ ...ok, ph: [0, 1] }, 2)).toBeNull();
    expect(repInfo({ ...ok, ph: [0, 1, 2] }, 2)).toBeNull();
    expect(repInfo({ ...ok, ph: [0, 1.5, 1] }, 2)).toBeNull();
    expect(repInfo({ ...ok, ph: [0, 0, 0] }, 2)).toBeNull();
    expect(repInfo({ dt: 0.02, s: [0], ph: [0] }, 1)).toBeNull();
  });

  it('reads the reference rep', () => {
    expect(info.frames).toBe(185);
    expect(info.last).toBe(184);
    expect(info.bottom).toBe(110);
    expect(info.starts).toEqual([0, 29, 101, 116, 157]);
  });
});

describe('frameAt / timeAt', () => {
  it('rounds to the nearest frame and clamps', () => {
    expect(frameAt(info, 2.44)).toBe(122);
    expect(frameAt(info, 2.45)).toBe(123);
    expect(frameAt(info, 0.29)).toBe(15);
    expect(frameAt(info, 99)).toBe(184);
    expect(frameAt(info, -1)).toBe(0);
    expect(frameAt(info, NaN)).toBe(0);
  });

  it('round-trips every frame through a two-decimal time', () => {
    for (let i = 0; i <= info.last; i++) {
      expect(frameAt(info, Number(timeAt(info, i).toFixed(2)))).toBe(i);
    }
  });
});

describe('directionAt', () => {
  it('turns at the first maximum of depth', () => {
    expect(directionAt(info, 0)).toBe('lowering');
    expect(directionAt(info, 109)).toBe('lowering');
    expect(directionAt(info, 110)).toBe('drive');
    expect(directionAt(info, 184)).toBe('drive');
  });
});
