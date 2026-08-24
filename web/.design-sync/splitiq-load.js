/* SplitIQ shared load model.
   Canonical CTL/ATL/TSB, readiness and baseline coverage for the mock athlete.
   Both the desktop overview and Coach read this so the two screens cannot
   state different numbers for the same day. Loaded as a classic script from
   each DC's <helmet>; assigns window.SIQ. */
(function () {
  const RAW = [
    [58, 'erg', 'UT2 60min', 'Z2 Aerobic'],
    [0, 'rest', '', 'Rest'],
    [71, 'erg', 'UT1 4x10min', 'Z2 Aerobic'],
    [44, 'str', 'Lower A', 'Lower Strength'],
    [0, 'rest', '', 'Rest'],
    [96, 'erg', 'Threshold 3x12', 'Threshold'],
    [62, 'bike', 'Z2 spin 75min', 'Cycling'],
    [63, 'erg', 'UT2 55min', 'Z2 Aerobic'],
    [0, 'rest', '', 'Rest'],
    [55, 'str', 'Upper A', 'Upper Strength'],
    [0, 'rest', '', 'Rest'],
    [38, 'erg', 'Sharpener 6x1', 'Sharpener'],
    [81, 'erg', 'UT1 5x8min', 'Z2 Aerobic'],
    [0, 'rest', '', 'Rest'],
    [74, 'erg', 'UT1 4x12min', 'Z2 Aerobic'],
    [49, 'str', 'Lower B', 'Lower Strength'],
    [0, 'rest', '', 'Rest'],
    [88, 'erg', 'Threshold 4x10', 'Threshold'],
    [52, 'bike', 'Z2 spin 60min', 'Cycling'],
    [0, 'rest', '', 'Rest'],
    [67, 'erg', 'UT2 65min', 'Z2 Aerobic'],
    [82, 'erg', 'UT1 5x10min', 'Z2 Aerobic'],
    [0, 'rest', '', 'Rest'],
    [74, 'str', 'Upper B', 'Upper Strength'],
    [70, 'erg', 'UT2 70min', 'Z2 Aerobic'],
    [96, 'erg', 'VO2 8x500m', 'VO₂ Intervals'],
    [55, 'bike', 'Z2 spin 60min', 'Cycling'],
    [82, 'erg', 'UT1 5x10min', 'Z2 Aerobic'],
  ];

  const SLEEP = [
    7.1, 7.4, 6.9, 7.6, 7.2, 6.4, 7.8, 7.3, 6.8, 7.5, 7.1, 6.6, 7.4, 7.0, 6.9,
    7.2, 6.5, 7.6, 7.1, 6.8, 7.3, 6.9, 6.2, 7.0, 6.6, 6.1, 6.7, 6.4,
  ];
  const RHR = [
    55,
    null,
    56,
    null,
    null,
    57,
    null,
    55,
    null,
    54,
    55,
    null,
    55,
    54,
    null,
    55,
    57,
    null,
    55,
    56,
    null,
    57,
    58,
    null,
    58,
    59,
    null,
    60,
  ];
  const HRV = [
    62,
    null,
    58,
    null,
    null,
    64,
    null,
    61,
    null,
    null,
    59,
    null,
    63,
    null,
    null,
    57,
    null,
    null,
    60,
    null,
    null,
    54,
    null,
    null,
    51,
    null,
    null,
    null,
  ];

  // Anchors. Baselines are inputs (rolling 28-day trimmed means from the app),
  // not claims about the arrays above.
  var SEED_CTL = 52,
    SEED_ATL = 52,
    B_SLEEP = 7.6,
    B_RHR = 55.4;
  var END = [2026, 5, 19];

  function cov(arr) {
    var n = 0;
    for (var i = 0; i < arr.length; i++) if (arr[i] != null) n++;
    return n;
  }

  function series() {
    var end = new Date(END[0], END[1], END[2]);
    var ctl = SEED_CTL,
      atl = SEED_ATL,
      out = [];
    for (var i = 0; i < RAW.length; i++) {
      var r = RAW[i];
      var d = new Date(end);
      d.setDate(end.getDate() - (RAW.length - 1 - i));
      var tss = Number(r[0]) || 0;
      ctl = ctl + (tss - ctl) / 42;
      atl = atl + (tss - atl) / 7;
      out.push({
        i: i,
        date: d,
        tss: tss,
        kind: r[1],
        label: r[2],
        type: r[3] || 'Rest',
        ctl: ctl,
        atl: atl,
        tsb: ctl - atl,
        sleep: SLEEP[i],
        rhr: RHR[i],
        hrv: HRV[i],
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
    var s = series(),
      last = s[s.length - 1];
    var gap = 0;
    for (var i = HRV.length - 1; i >= 0 && HRV[i] == null; i--) gap++;
    var raw = [
      {
        label:
          'Sleep ' +
          last.sleep.toFixed(1) +
          'h vs ' +
          B_SLEEP.toFixed(1) +
          'h baseline',
        pts: Math.round((B_SLEEP - last.sleep) * 12),
      },
      {
        label: 'RHR ' + last.rhr + ' vs ' + B_RHR.toFixed(1) + ' baseline',
        pts: Math.round((last.rhr - B_RHR) * 2),
      },
      {
        label:
          gap === 0
            ? 'HRV below baseline'
            : 'HRV — no reading in ' + gap + (gap === 1 ? ' day' : ' days'),
        pts: Math.min(8, gap + 2),
      },
    ];
    var total = 0;
    for (var j = 0; j < raw.length; j++) total += Math.max(0, raw[j].pts);
    var score = 100 - total;
    return {
      score: score,
      hrvGap: gap,
      deductions: raw,
      label: score < 50 ? 'Compromised' : score < 75 ? 'Guarded' : 'Ready',
      ink: score < 50 ? '#a32040' : score < 75 ? '#8a6a10' : '#10795a',
      coverage: {
        sleep: cov(SLEEP),
        rhr: cov(RHR),
        hrv: cov(HRV),
        days: SLEEP.length,
      },
      baselines: { sleep: B_SLEEP, rhr: B_RHR },
    };
  }

  function today() {
    var s = series(),
      last = s[s.length - 1],
      r = readiness();
    return {
      date: last.date,
      ctl: last.ctl,
      atl: last.atl,
      tsb: last.tsb,
      band: tsbBand(last.tsb),
      readiness: r.score,
      readinessLabel: r.label,
      sleep: last.sleep,
      rhr: last.rhr,
      hrv: last.hrv,
    };
  }

  window.SIQ = {
    RAW: RAW,
    SLEEP: SLEEP,
    RHR: RHR,
    HRV: HRV,
    series: series,
    readiness: readiness,
    tsbBand: tsbBand,
    today: today,
    fmt: function (v, dp) {
      return v.toFixed(dp == null ? 1 : dp).replace('-', '−');
    },
  };
})();
