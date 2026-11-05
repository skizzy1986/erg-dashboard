// The reference rep's headline numbers, derived from the manifest's `meta`.
//
// Every figure the guide, the form check and the metrics table print about the
// model comes from here, computed the way the source page computed it
// (page/4-ui.js), so a re-run of the pipeline moves the prose with the data
// instead of leaving a stale literal behind. Pure: no DOM, no React.

// U+2212 for negatives, and no "-0" — the source's formatting, kept verbatim.
export function fmt(v, dp = 0) {
  const t = (+v).toFixed(dp);
  if (t === '-0' || t === '-0.0' || t === '-0.00') return t.slice(1);
  return t.replace('-', '−');
}

const lerpArr = (arr, x) => {
  const i0 = Math.max(0, Math.min(arr.length - 2, Math.floor(x)));
  const u = Math.min(1, Math.max(0, x - i0));
  return arr[i0] + (arr[i0 + 1] - arr[i0]) * u;
};

const LEN_SHOW = [
  ['Gluteus maximus', 'gluteus maximus'],
  ['Adductor magnus', 'adductor magnus'],
  ['Vastus lateralis', 'vastus lateralis'],
  ['Biceps femoris (long head)', 'biceps femoris long head'],
  ['Soleus', 'soleus'],
  ['Rectus femoris', 'rectus femoris'],
];

export const STICK_TEXT = '8–22 cm above the bottom';

/**
 * @param {object} meta manifest.meta
 * @returns {{ kv: Record<string,string>, checks: string[], metrics: string[], score: string }}
 */
export function summariseRep(meta) {
  const RO = meta.readout;
  const REP = meta.rep;
  const ARM = meta.arm || {};
  const MUS = meta.muscles;
  const NS = meta.S.length;
  const RN = REP.s.length;
  const RB = RO[NS - 1];
  const R0 = RO[0];
  const pk = meta.bw;
  const ratio = RB.Mhip / RB.Mknee;
  const mi = (n) => MUS.findIndex((m) => m.name === n);
  const actOf = (k, s, asc) => {
    const a = MUS[k]?.act;
    if (!a) return 0;
    return lerpArr(a[asc ? 1 : 0], s * (NS - 1)) / 255;
  };

  const lens = LEN_SHOW.map(([n, lab]) => {
    const k = mi(n);
    const L = MUS[k].len[NS - 1] - 100;
    return `${lab} ${L >= 0 ? '+' : '−'}${Math.abs(Math.round(L))}%`;
  }).join(', ');

  let feccLo = 9;
  let feccHi = 0;
  let flock = 9;
  for (let i = 0; i < RN; i++) {
    if (REP.ph[i] === 1) {
      feccLo = Math.min(feccLo, REP.f[i]);
      feccHi = Math.max(feccHi, REP.f[i]);
    }
    if (REP.ph[i] >= 3) flock = Math.min(flock, REP.f[i]);
  }
  const drift = fmt(Math.max(...RO.map((r) => Math.abs(r.bar))), 0);

  const kv = {
    er: `${Math.round(ARM.er)}°`,
    elbow: `${Math.round(ARM.elbow)}°`,
    elev: `${Math.round(ARM.elev)}°`,
    wrist: `${Math.round(ARM.wrist)}°`,
    grip: `${Math.round(ARM.grip)} cm`,
    ecc: `${fmt(REP.ecc, 2)} s`,
    con: `${fmt(REP.con, 2)} s`,
    trans: `${fmt(REP.trans, 2)} s`,
    mcv: `${fmt(REP.mcv, 2)} m/s`,
    vpk: `${fmt(REP.vpk, 2)} m/s`,
    vecc: `${fmt(REP.vecc, 2)} m/s`,
    fpk: `${fmt(REP.fpk, 2)}× system weight`,
    fpkx: `${fmt(REP.fpk, 2)}×`,
    fecc: `${fmt(feccLo, 2)}–${fmt(feccHi, 2)}× system weight`,
    flock: `down to ${fmt(flock, 2)}× system weight`,
    depthtxt: `hip ${fmt(-RB.depth, 1)} cm below knee`,
    lord: `${Math.round(R0.lord)}° → ${Math.round(RB.lord)}°`,
    lens,
    sticktxt: STICK_TEXT,
    cop0: `${Math.round(R0.cop)}%`,
    cop1: `${Math.round(RB.cop)}%`,
  };

  // Same order as constants/formCheck.js.
  const checks = [
    `${drift} mm drift, vertical path`,
    `Hip ${fmt(-RB.depth, 1)} cm below knee, thighs ${fmt(RB.thigh, 0)}° below parallel`,
    `${fmt(RB.klat, 1)} cm outside the heel to second-toe line at depth`,
    `Trunk ${fmt(RB.lean, 0)}°, shin ${fmt(RB.shin, 0)}° at depth (${fmt(Math.abs(RB.lean - RB.shin), 0)}° apart)`,
    `${fmt(RB.lumbar, 0)}° lumbar flexion, curve still ${fmt(RB.lord, 0)}° lordotic`,
    `Centre of pressure ${fmt(R0.cop, 0)}% → ${fmt(RB.cop, 0)}% of foot from heel`,
    `Hip to knee moment ratio ${fmt(ratio, 2)} at depth`,
    `${fmt(RB.ankle, 0)}° dorsiflexion at depth, heels down`,
    `${fmt(REP.ecc, 2)} s down, ${fmt(REP.con, 2)} s up, ${fmt(REP.mcv, 2)} m/s mean drive`,
    `Shoulder blades retracted, elbows down, wrist within ${Math.round(ARM.wrist)}° of straight`,
  ];

  const vl = mi('Vastus lateralis');
  // Same order as constants/metricsTable.js.
  const metrics = [
    `${drift} mm drift`,
    `Hip ${fmt(-RB.depth, 1)} cm below knee; thighs ${fmt(RB.thigh, 0)}° below parallel`,
    `${fmt(RB.knee, 0)}°`,
    `${fmt(RB.hip, 0)}°`,
    `${fmt(R0.ankle, 0)}° → ${fmt(RB.ankle, 0)}°`,
    `${fmt(RB.lean, 0)}° vs ${fmt(RB.shin, 0)}°`,
    `${fmt(RB.lumbar, 0)}° flexion; curve ${fmt(R0.lord, 0)}° → ${fmt(RB.lord, 0)}°`,
    `${fmt(RB.klat, 1)} cm outside the toe line`,
    `${fmt(R0.cop, 0)}% → ${fmt(RB.cop, 0)}% of foot from heel`,
    `${fmt(ratio, 2)} at depth`,
    `Hip ${fmt(RB.Mhip / pk, 2)}, knee ${fmt(RB.Mknee / pk, 2)}, ankle ${fmt(RB.Mank / pk, 2)}, L5/S1 ${fmt(RB.Mlum / pk, 2)} N·m/kg`,
    `${fmt(REP.fmin, 2)}–${fmt(REP.fpk, 2)}× system weight`,
    `${fmt(REP.vecc, 2)} m/s peak down; ${fmt(REP.mcv, 2)} mean, ${fmt(REP.vpk, 2)} peak up`,
    `${fmt(REP.ecc, 2)} s down, ${fmt(REP.trans, 2)} s around the bottom, ${fmt(REP.con, 2)} s up`,
    STICK_TEXT,
    `External rotation ${Math.round(ARM.er)}°, elevation ${Math.round(ARM.elev)}°, elbow ${Math.round(ARM.elbow)}°, wrist within ${Math.round(ARM.wrist)}°`,
    `Vastus lateralis ${Math.round(actOf(vl, 0.9, false) * 100)}% lowering vs ${Math.round(actOf(vl, 0.9, true) * 100)}% driving at 90% depth`,
    lens,
  ];

  return { kv, checks, metrics };
}
