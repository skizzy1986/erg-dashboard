/* SplitIQ shared load model.
   Canonical CTL/ATL/TSB, readiness and baseline coverage for the mock athlete.
   Both the desktop overview and Coach read this so the two screens cannot
   state different numbers for the same day. Loaded as a classic script from
   each DC's <helmet>; assigns window.SIQ. */
(function () {
const RAW = [
  [58,'erg','UT2 60min','Z2 Aerobic'],[0,'rest','','Rest'],[71,'erg','UT1 4x10min','Z2 Aerobic'],[44,'str','Lower A','Lower Strength'],[0,'rest','','Rest'],[96,'erg','Threshold 3x12','Threshold'],[62,'bike','Z2 spin 75min','Cycling'],
  [63,'erg','UT2 55min','Z2 Aerobic'],[0,'rest','','Rest'],[55,'str','Upper A','Upper Strength'],[0,'rest','','Rest'],[38,'erg','Sharpener 6x1','Sharpener'],[81,'erg','UT1 5x8min','Z2 Aerobic'],[0,'rest','','Rest'],
  [74,'erg','UT1 4x12min','Z2 Aerobic'],[49,'str','Lower B','Lower Strength'],[0,'rest','','Rest'],[88,'erg','Threshold 4x10','Threshold'],[52,'bike','Z2 spin 60min','Cycling'],[0,'rest','','Rest'],[67,'erg','UT2 65min','Z2 Aerobic'],
  [82,'erg','UT1 5x10min','Z2 Aerobic'],[0,'rest','','Rest'],[74,'str','Upper B','Upper Strength'],[70,'erg','UT2 70min','Z2 Aerobic'],[96,'erg','VO2 8x500m','VO₂ Intervals'],[55,'bike','Z2 spin 60min','Cycling'],[82,'erg','UT1 5x10min','Z2 Aerobic'],
];

const SLEEP = [7.1,7.4,6.9,7.6,7.2,6.4,7.8,7.3,6.8,7.5,7.1,6.6,7.4,7.0,6.9,7.2,6.5,7.6,7.1,6.8,7.3,6.9,6.2,7.0,6.6,6.1,6.7,6.4];
const RHR   = [55,null,56,null,null,57,null,55,null,54,55,null,55,54,null,55,57,null,55,56,null,57,58,null,58,59,null,60];
const HRV   = [62,null,58,null,null,64,null,61,null,null,59,null,63,null,null,57,null,null,60,null,null,54,null,null,51,null,null,null];

  // Anchors. Baselines are inputs (rolling 28-day trimmed means from the app),
  // not claims about the arrays above.
  var SEED_CTL = 52, SEED_ATL = 52, B_SLEEP = 7.6, B_RHR = 55.4;

  // How much each metric moves the score. These are the coefficients, not a
  // description of them — every deduction on every screen reads them.
  var SENS = { sleep: 12, rhr: 2, hrvStaleBase: 2, hrvPerDay: 1, hrvMax: 8 };
  var END = [2026, 5, 19];

  function cov(arr) { var n = 0; for (var i = 0; i < arr.length; i++) if (arr[i] != null) n++; return n; }

  function series() {
    var end = new Date(END[0], END[1], END[2]);
    var ctl = SEED_CTL, atl = SEED_ATL, out = [];
    for (var i = 0; i < RAW.length; i++) {
      var r = RAW[i];
      var d = new Date(end);
      d.setDate(end.getDate() - (RAW.length - 1 - i));
      var tss = Number(r[0]) || 0;
      ctl = ctl + (tss - ctl) / 42;
      atl = atl + (tss - atl) / 7;
      out.push({
        i: i, date: d, tss: tss, kind: r[1], label: r[2], type: r[3] || 'Rest',
        ctl: ctl, atl: atl, tsb: ctl - atl,
        sleep: SLEEP[i], rhr: RHR[i], hrv: HRV[i],
      });
    }
    return out;
  }

  // The app's own tsbColor thresholds: +10 / −10 / −30.
  function tsbBand(tsb) {
    if (tsb > 10) return { label: 'Fresh', ink: '#10795a' };
    if (tsb > -10) return { label: 'Neutral', ink: '#10795a' };
    if (tsb > -30) return { label: 'Loaded', ink: '#8a6a10' };
    return { label: 'Deep fatigue', ink: '#a32040' };
  }

  function readiness() {
    var s = series(), last = s[s.length - 1];
    var gap = 0;
    for (var i = HRV.length - 1; i >= 0 && HRV[i] == null; i--) gap++;
    var raw = [
      { label: 'Sleep ' + last.sleep.toFixed(1) + 'h vs ' + B_SLEEP.toFixed(1) + 'h baseline', pts: Math.round((B_SLEEP - last.sleep) * 12) },
      { label: 'RHR ' + last.rhr + ' vs ' + B_RHR.toFixed(1) + ' baseline', pts: Math.round((last.rhr - B_RHR) * 2) },
      { label: gap === 0 ? 'HRV below baseline' : 'HRV — no reading in ' + gap + (gap === 1 ? ' day' : ' days'), pts: Math.min(8, gap + 2) },
    ];
    var total = 0;
    for (var j = 0; j < raw.length; j++) total += Math.max(0, raw[j].pts);
    var score = 100 - total;
    return {
      score: score, hrvGap: gap, deductions: raw,
      label: score < 50 ? 'Compromised' : score < 75 ? 'Guarded' : 'Ready',
      ink: score < 50 ? '#a32040' : score < 75 ? '#8a6a10' : '#10795a',
      coverage: { sleep: cov(SLEEP), rhr: cov(RHR), hrv: cov(HRV), days: SLEEP.length },
      baselines: { sleep: B_SLEEP, rhr: B_RHR },
    };
  }

  // Per-day readiness, same arithmetic as readiness() applied historically.
  // computeReadiness returns null when RHR is missing — that is a real state,
  // not a zero, so those days carry no score and say why.
  function readinessSeries() {
    var s = series();
    return s.map(function (p, i) {
      var gap = 0;
      for (var j = i; j >= 0 && HRV[j] == null; j--) gap++;
      if (p.rhr == null) {
        return { date: p.date, i: i, score: null, reason: 'no RHR reading', deductions: [] };
      }
      var d = [
        { key: 'sleep', label: 'Sleep', pts: Math.round((B_SLEEP - p.sleep) * SENS.sleep) },
        { key: 'rhr', label: 'Resting HR', pts: Math.round((p.rhr - B_RHR) * SENS.rhr) },
        { key: 'hrv', label: 'HRV', pts: gap === 0 ? 0 : Math.min(8, gap + 2) },
      ];
      var total = 0;
      for (var k = 0; k < d.length; k++) total += Math.max(0, d[k].pts);
      return { date: p.date, i: i, score: 100 - total, deductions: d, hrvGap: gap, reason: null };
    });
  }

  function today() {
    var s = series(), last = s[s.length - 1], r = readiness();
    return {
      date: last.date, ctl: last.ctl, atl: last.atl, tsb: last.tsb,
      band: tsbBand(last.tsb), readiness: r.score, readinessLabel: r.label,
      sleep: last.sleep, rhr: last.rhr, hrv: last.hrv,
    };
  }

  // Zones derive from critical power. CP is provisional (~205W) and the app reads
  // it live from the rowing_cp anchor, so no band is ever typed into a design.
  var CP = 205;

  // The app's own six-zone vocabulary. Names and fractions read off the shipped
  // PACE_ZONES table (whose watt bounds are the stale CP-190 set — the structure
  // is what transfers, not the numbers): Recovery, UT2, UT1, AT, TR, AN.
  var ZONE_EDGES = [
    ['Recovery', 0,    0.55],
    ['UT2',      0.55, 0.70],
    ['UT1',      0.70, 0.80],
    ['AT',       0.80, 0.90],
    ['TR',       0.90, 1.05],
    ['AN',       1.05, 1.30],
  ];
  function zoneTable(cp) {
    var c = cp == null ? CP : cp;
    return ZONE_EDGES.map(function (z) {
      return { zone: z[0], wattsLow: Math.round(c * z[1]), wattsHigh: Math.round(c * z[2]) };
    });
  }
  function paceZones(cp) {
    var out = {};
    zoneTable(cp).forEach(function (z) { out[z.zone] = [z.wattsLow, z.wattsHigh]; });
    return out;
  }
  function bandTxt(name, cp) { var z = paceZones(cp)[name]; return z[0] + '–' + z[1]; }

  // Erg metrics. Watts sit in the band the session type prescribes, so the zone
  // label is never independent of the number. Split comes from the standard
  // rowing power relation, watts = 2.80 / pace^3 (pace in s/m) — not invented.
  var BAND_OF = {
    'Z2 Aerobic': 'UT1', 'Threshold': 'AT', 'VO₂ Intervals': 'AT',
    'Sharpener': 'AT', 'Cycling': null, 'Rest': null,
  };
  function fmtSplit(s) {
    var mm = Math.floor(s / 60), ss = s - mm * 60;
    return mm + ':' + (ss < 10 ? '0' : '') + ss.toFixed(1);
  }
  function splitOf(watts) {
    var pace = Math.pow(2.80 / watts, 1 / 3);
    var s = 500 * pace;
    return { pace: pace, seconds: s, split: fmtSplit(s) };
  }
  function zoneOf(watts, cp) {
    var t = zoneTable(cp);
    for (var i = 0; i < t.length; i++) if (watts <= t[i].wattsHigh) return t[i].zone;
    return t[t.length - 1].zone;
  }
  function bandFor(p) {
    if (/^UT2/.test(p.label || '')) return 'UT2';
    if (/^UT1/.test(p.label || '')) return 'UT1';
    return BAND_OF[p.type];
  }
  function ergOf(p, cp) {
    var band = bandFor(p);
    if (p.tss <= 0 || !band) return null;
    var z = paceZones(cp)[band];
    var mid = (z[0] + z[1]) / 2;
    var watts = Math.round(mid + ((p.tss % 7) - 3) * 2 + (p.type === 'VO₂ Intervals' ? 22 : 0));
    var sp = splitOf(watts);
    var mins = p.tss * 0.9;
    return {
      watts: watts, split: sp.split, minutes: Math.round(mins),
      distance_m: Math.round((mins * 60) / sp.pace),
      zone: zoneOf(watts, cp),
    };
  }

  // Per-set strength. Sparse by design: most logged sessions carry a container
  // and no sets, which is the real state of the data.
  var STRENGTH = [
    { i: 3,  sets: [{ lift: 'Back Squat', w: 95, r: 5 },   { lift: 'Deadlift', w: 120, r: 5 }] },
    { i: 9,  sets: [{ lift: 'Bench Press', w: 72.5, r: 5 }, { lift: 'Barbell Row', w: 65, r: 6 }] },
    { i: 15, sets: [{ lift: 'Back Squat', w: 97.5, r: 5 }, { lift: 'Deadlift', w: 125, r: 4 }] },
    { i: 23, sets: [{ lift: 'Bench Press', w: 75, r: 5 },  { lift: 'Barbell Row', w: 67.5, r: 6 }] },
  ];
  function e1rm(w, r) { return w * (1 + r / 30); }
  function strengthSeries() {
    var s = series(), out = {};
    for (var k = 0; k < STRENGTH.length; k++) {
      var row = STRENGTH[k], day = s[row.i];
      for (var j = 0; j < row.sets.length; j++) {
        var st = row.sets[j];
        (out[st.lift] = out[st.lift] || []).push({
          date: day.date, i: row.i, weight: st.w, reps: st.r, e1rm: e1rm(st.w, st.r),
        });
      }
    }
    return out;
  }

  window.SIQ = {
    ergOf: ergOf, zoneOf: zoneOf, splitOf: splitOf, fmtSplit: fmtSplit, strengthSeries: strengthSeries,
    loggedStrengthSessions: STRENGTH.length,
    CP: CP, paceZones: paceZones, zoneTable: zoneTable, bandTxt: bandTxt,
    RAW: RAW, SLEEP: SLEEP, RHR: RHR, HRV: HRV,
    series: series, readiness: readiness, tsbBand: tsbBand, today: today,
    readinessSeries: readinessSeries, SENS: SENS,
    baselines: { sleep: B_SLEEP, rhr: B_RHR },
    fmt: function (v, dp) { return v.toFixed(dp == null ? 1 : dp).replace('-', '−'); },
  };
})();
