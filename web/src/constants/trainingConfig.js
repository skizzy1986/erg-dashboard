// Training science constants — static reference data only. Live calibration values
// (CP/FTP) come from the `anchors` table via useAnchors(); never mirror one here.

import { wattsToPace500 } from '../utils/pace.js';
import { THEME } from './theme.js';

export const SRPE_GUIDE = [
  {
    range: '1-2',
    label: 'Very easy',
    anchor: 'Could do all day. Full conversation, nose-breathing.',
    zone: 'Recovery',
    color: THEME.neutral,
  },
  {
    range: '3-4',
    label: 'Easy (UT2)',
    anchor: 'Full conversation = 3. Comfortable, sustainable for hours.',
    zone: 'UT2',
    color: THEME.accent,
  },
  {
    range: '5-6',
    label: 'Steady (UT1)',
    anchor:
      'Talking in sentences but aware of breathing. Working but controlled.',
    zone: 'UT1',
    color: THEME.positive,
  },
  {
    range: '7-8',
    label: 'Hard (threshold)',
    anchor: 'Short phrases only. Genuinely taxing. Threshold/AT.',
    zone: 'AT/TR',
    color: THEME.caution,
  },
  {
    range: '9-10',
    label: 'Max',
    anchor: 'Words impossible. All-out. Race/test efforts only.',
    zone: 'Sprint',
    color: THEME.critical,
  },
];

export const FTP_TEST = {
  when: 'On a fresh day, not the back end of a hard block.',
  protocol:
    '30min continuous at the hardest STEADY pace you can hold the full 30 (not a sprint). CP ≈ 95% of the 30min avg power. This is a Critical Power test in rowing terms. Or 4×8min progressive steps to map HR-power.',
  prereq:
    'Fresh, well-fuelled, chest strap, your usual drag factor, separate warmup.',
  unlocks:
    'A measured CP recalibrates the load model (TSS/CTL/ATL/TSB) and the pace zones.',
};

const ZONE_POWER_PCT = [
  { zone: 'Recovery', color: '#666', pctLow: 0, pctHigh: 0.55 },
  { zone: 'UT2', color: THEME.accent, pctLow: 0.55, pctHigh: 0.7 },
  { zone: 'UT1', color: THEME.positive, pctLow: 0.7, pctHigh: 0.8 },
  { zone: 'AT', color: THEME.caution, pctLow: 0.8, pctHigh: 0.9 },
  { zone: 'TR', color: THEME.warning, pctLow: 0.9, pctHigh: 1.05 },
  { zone: 'AN', color: THEME.critical, pctLow: 1.05, pctHigh: 1.3 },
];

// Derive the power/pace zone bands from a Critical Power value. Pure — callers
// pass the current `anchors.rowing_cp` (see ErgView). There is deliberately no
// static PACE_ZONES export: a second set of bands keyed off a seed constant would
// silently diverge from the live one.
export function derivePaceZones(cp) {
  return ZONE_POWER_PCT.map(({ zone, color, pctLow, pctHigh }) => {
    const wattsLow = Math.round(cp * pctLow);
    const wattsHigh = Math.round(cp * pctHigh);
    return {
      zone,
      color,
      wattsLow,
      wattsHigh,
      paceFloor: pctHigh > 0 ? wattsToPace500(wattsHigh) : 300,
      paceCeil: pctLow > 0 ? wattsToPace500(wattsLow) : 300,
    };
  });
}
