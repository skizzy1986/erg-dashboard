import { checkBands } from '../check-zone-bands.mjs';
import { derivePaceZones } from '../../src/constants/trainingConfig.js';

// Synthetic documents only — the labelled example CP (~200 W), never a live value.
const CANARY = '.claude/skills/training-science.md';
const GOOD_BAND =
  'Worked example — CP ~200 W (example only): UT2 110–140 / UT1 140–160 / AT 160–180 W.';

describe('checkBands', () => {
  it('passes a correct band in the canary file', () => {
    const { checked, failures } = checkBands(
      [{ path: CANARY, text: GOOD_BAND }],
      derivePaceZones
    );
    expect(checked).toBe(1);
    expect(failures).toEqual([]);
  });

  it('reports a band that drifted from derivePaceZones', () => {
    const { failures } = checkBands(
      [
        { path: CANARY, text: GOOD_BAND },
        {
          path: 'docs/example.md',
          text: 'CP ~200 W: UT2 110–140 / UT1 140–160 / AT 160–200 W',
        },
      ],
      derivePaceZones
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/docs\/example\.md gives AT as 160-200 W/);
  });

  it('fails as vacuous when no band is published anywhere', () => {
    const { checked, failures } = checkBands(
      [
        { path: CANARY, text: 'Zones are fractions of CP.' },
        { path: 'README.md', text: 'Mentions UT1/UT2 in passing only.' },
      ],
      derivePaceZones
    );
    expect(checked).toBe(0);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/vacuous/);
  });

  it('fails when the band lives elsewhere but not in training-science.md', () => {
    const { checked, failures } = checkBands(
      [
        { path: CANARY, text: 'No worked band here.' },
        { path: 'CLAUDE.md', text: GOOD_BAND },
      ],
      derivePaceZones
    );
    expect(checked).toBe(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain(CANARY);
  });

  it('reads the CP that introduces the band, past an earlier line of zone percentages', () => {
    const text =
      'Rowing zones are fractions of CP from `derivePaceZones(cp)`: ' +
      'UT2 55–70 % / UT1 70–80 % / AT 80–90 %. Worked example — ' +
      'CP ~200 W (example only): UT2 110–140 / UT1 140–160 / AT 160–180 W.';
    const { checked, failures } = checkBands(
      [{ path: CANARY, text }],
      derivePaceZones
    );
    expect(failures).toEqual([]);
    expect(checked).toBe(1);
  });

  it('flags a band that names no CP to derive from', () => {
    const { failures } = checkBands(
      [
        { path: CANARY, text: GOOD_BAND },
        { path: 'docs/x.md', text: 'UT2 110–140 / UT1 140–160 / AT 160–180 W' },
      ],
      derivePaceZones
    );
    expect(failures).toEqual([
      'docs/x.md publishes UT2/UT1/AT bands but names no CP to derive them from',
    ]);
  });
});
