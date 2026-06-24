export const CRITICAL_POWER = {
  cpEstimate: 190,
  wPrime: null,
  northStar: "2k pace",
  status: "Awaiting test efforts — CP confirmed by 30min test, curve by format-specific maxes",
};

export const HR_ZONES = [
  { zone:"UT2", name:"Aerobic Base",     pct:"< 70%",    bpm:"< 119",   lactate:"< 2 mmol/L", color:"#00d4ff", desc:"Long Z2 rows. Conversational. Fat metabolism. Primary base building zone." },
  { zone:"UT1", name:"Aerobic Dev.",     pct:"70–80%",   bpm:"119–136", lactate:"2–3 mmol/L", color:"#34d399", desc:"Upper aerobic. Sustainable for 45–60min. Z2 working target. Keep splits flat within this band." },
  { zone:"AT",  name:"Threshold",        pct:"80–87%",   bpm:"136–148", lactate:"3–5 mmol/L", color:"#ffd700", desc:"Lactate threshold. Grey zone for base phase — avoid. Threshold reps added in Phase 2." },
  { zone:"TR",  name:"VO₂ / Transport",  pct:"87–92%",   bpm:"148–156", lactate:"5–8 mmol/L", color:"#ff6b35", desc:"VO₂max zone. Short intervals (500m pieces). Phase 3 only." },
  { zone:"AN",  name:"Anaerobic",        pct:"> 92%",    bpm:"> 156",   lactate:"> 8 mmol/L", color:"#ff2d55", desc:"Race pace. 2k test finish. Not trained directly — emerges from race effort." },
];

export const EST_MHR = 170;

export const SRPE_GUIDE = [
  { range:"1-2", label:"Very easy", anchor:"Could do all day. Full conversation, nose-breathing.", zone:"Recovery", color:"#3a3a4a" },
  { range:"3-4", label:"Easy (UT2)", anchor:"Full conversation = 3. Comfortable, sustainable for hours.", zone:"UT2", color:"#00d4ff" },
  { range:"5-6", label:"Steady (UT1)", anchor:"Talking in sentences but aware of breathing. Working but controlled.", zone:"UT1", color:"#34d399" },
  { range:"7-8", label:"Hard (threshold)", anchor:"Short phrases only. Genuinely taxing. Threshold/AT.", zone:"AT/TR", color:"#ffd700" },
  { range:"9-10", label:"Max", anchor:"Words impossible. All-out. Race/test efforts only.", zone:"Sprint", color:"#ff2d55" },
];

export const REP_SCHEMES = [
  { tier:"Heavy Compounds", reps:"4–6", rest:"3 min", color:"#34d399",
    lifts:"Squat · Deadlift · RDL",
    why:"Maximal strength & rate of force development. Best transfer to drive/pedal, least aerobic interference. Drive concentric explosively." },
  { tier:"Strength / Size", reps:"5–8", rest:"2–3 min", color:"#00d4ff",
    lifts:"Barbell Row · Bench · Incline · Pulldown",
    why:"Balance of strength and hypertrophy. Pulling builds the rowing engine + back thickness; pressing is aesthetic." },
  { tier:"Hypertrophy", reps:"8–12", rest:"60–90 sec", color:"#a78bfa",
    lifts:"Curls · Lateral raises · Leg curl · Flyes · Calves",
    why:"Aesthetic work on small muscles. Low systemic fatigue cost — won't compromise erg recovery." },
];

export const DAILY_TSS = [
  { date:"2026-05-22", tss:14,  note:"5k erg" },
  { date:"2026-05-24", tss:15,  note:"5k erg" },
  { date:"2026-05-25", tss:55,  note:"10k erg (hard push)" },
  { date:"2026-05-31", tss:40,  note:"Upper strength" },
  { date:"2026-06-03", tss:55,  note:"Combined strength" },
  { date:"2026-06-04", tss:89,  note:"10k erg + upper strength" },
  { date:"2026-06-05", tss:121, note:"10k baseline + lower strength" },
  { date:"2026-06-06", tss:35,  note:"10k easy" },
  { date:"2026-06-07", tss:50,  note:"Upper strength" },
  { date:"2026-06-08", tss:100, note:"60min row + upper strength" },
  { date:"2026-06-09", tss:87,  note:"30min row + lower strength" },
  { date:"2026-06-10", tss:98,  note:"45min Z2 + Upper Day 2 (sRPE 8)" },
  { date:"2026-06-12", tss:103, note:"45min UT1 + Lower Day 2 (both sRPE 6)" },
  { date:"2026-06-13", tss:75,  note:"60min UT1 long row (sRPE 6 — first full hour)" },
];

export const CALIBRATION_STATUS = [
  { metric:"Power @ HR130", tier:1, conf:"Solid", color:"#34d399",
    basis:"Chest strap, fixed DF, drag-independent", upgrade:"Log conditions (caffeine/cannabis/heat) for like-for-like — shift HR-power 3–8W" },
  { metric:"RHR baseline (58)", tier:1, conf:"Solid", color:"#34d399",
    basis:"3 consecutive overnight readings", upgrade:"—" },
  { metric:"Session data (W/pace/rate)", tier:1, conf:"Solid", color:"#34d399",
    basis:"PM5 + strap + standardised DF125 + separate warmup", upgrade:"—" },
  { metric:"Strava cross-check", tier:1, conf:"Independent 2nd source", color:"#34d399",
    basis:"Auto-syncs every erg session. Independent HR/watts + Relative Effort metric", upgrade:"Triangulates PM5 data — 6/13 showed HR 130.6 (Strava) vs 134 (C2), watts agreed 149/150" },
  { metric:"TDEE (~3,140)", tier:2, conf:"Estimated", color:"#ffd700",
    basis:"Two methods agree, both estimates", upgrade:"Intake-vs-weight regression at end of calibration (~Jun 24)" },
  { metric:"TSS / CTL / ATL / TSB", tier:2, conf:"Estimated", color:"#ffd700",
    basis:"CP/FTP est. 190W (untested), strength TSS ±30%, CTL needs 42d (have ~3wk)", upgrade:"4-min CP test (1 Jul) → real anchor recalibrates everything" },
  { metric:"Daily net calories", tier:2, conf:"±300 resolution", color:"#ffd700",
    basis:"Fitbit burn ±10–20% — don't judge ±100 swings", upgrade:"Weekly avg vs weight trend, not daily" },
  { metric:"HR zones (MHR 170)", tier:2, conf:"Conservative", color:"#ffd700",
    basis:"Chosen 170 vs observed max 177–187 — deliberate for base", upgrade:"Revisit before Build 1 — race-pace needs true-max anchoring" },
  { metric:"HRV baseline (30)", tier:3, conf:"Fragile", color:"#ff6b35",
    basis:"2 readings, both in a fatigue trough — skewed LOW", upgrade:"Rebuild over 10+ days incl. recovered days" },
  { metric:"Readiness score", tier:3, conf:"Heuristic", color:"#ff6b35",
    basis:"My weightings, not validated coefficients", upgrade:"Cross-check with sRPE — no binary calls off the number" },
  { metric:"165–180W projection", tier:3, conf:"Hypothesis", color:"#ff6b35",
    basis:"3 points / 1 week, some gain is setup-settling", upgrade:"End-of-base 5k benchmark replaces it" },
  { metric:"2k estimate (7:30–45)", tier:3, conf:"Unknown", color:"#ff6b35",
    basis:"Zero threshold/anaerobic data yet", upgrade:"First real test — ±20sec either way" },
];

export const HR130_POWER = [
  { date:"6/8",  watts:130, type:"actual", setupArtifact:true },
  { date:"6/10", watts:145, type:"actual" },
  { date:"6/12", watts:151, type:"actual" },
  { date:"6/13", watts:149, type:"actual" },
  { date:"6/15", watts:149, type:"actual" },
];

export const HR130_PROJECTION = {
  startWatts: 151,
  endLow: 165,
  endHigh: 180,
  endDate: "early Sep",
  note: "Projection assumes consistent execution + sleep holding. Early-phase return gains slow over time. 4 clean points now (134→145→151→149 at HR130), incl. Strava-verified. We replace this with real data at the end-of-base 5k benchmark. Watch actual vs band.",
};

export const strengthTrend = {
  "Back Squat":         [{ date:"6/3", e1rm:109.7 }, { date:"6/5", e1rm:110.5 }, { date:"6/9", e1rm:118.0 }],
  "Romanian Deadlift":  [{ date:"6/3", e1rm:85.2  }, { date:"6/5", e1rm:89.2  }, { date:"6/9", e1rm:95.8  }],
  "Bench Press":        [{ date:"6/3", e1rm:63.4  }, { date:"6/8", e1rm:71.2  }],
  "Incline Bench":      [{ date:"6/3", e1rm:52.9  }, { date:"6/7", e1rm:55.8  }, { date:"6/8", e1rm:61.7 }],
  "Cable Row":          [{ date:"5/31",e1rm:62.3  }, { date:"6/4", e1rm:74.6  }, { date:"6/8", e1rm:98.0 }],
  "Barbell Row":        [{ date:"5/31",e1rm:53.8  }, { date:"6/4", e1rm:62.8  }],
  "Lat Pulldown":       [{ date:"5/31",e1rm:66.1  }, { date:"6/4", e1rm:74.6  }],
  "Shoulder Press":     [{ date:"6/4", e1rm:41.9  }, { date:"6/7", e1rm:46.2  }],
};

export const ergTrend = [
  { date:"5/22", dist:"5k",  pace:147.9, watts:110, label:"5k",  hardPush:false },
  { date:"5/24", dist:"5k",  pace:145.4, watts:115, label:"5k",  hardPush:false },
  { date:"5/25", dist:"10k", pace:130.4, watts:163, label:"10k", hardPush:true  },
  { date:"6/4",  dist:"10k", pace:134.8, watts:143, label:"10k", hardPush:false },
  { date:"6/5",  dist:"10k", pace:125.1, watts:181, label:"10k", hardPush:true  },
  { date:"6/6",  dist:"10k", pace:141.3, watts:125, label:"10k", hardPush:false },
  { date:"6/8",  dist:"60m", pace:136.2, watts:134, label:"60m", hardPush:false },
  { date:"6/9",  dist:"30m", pace:132.1, watts:152, label:"30m", hardPush:false },
  { date:"6/10", dist:"45m", pace:134.1, watts:145, label:"45m", hardPush:false },
  { date:"6/12", dist:"45m", pace:132.3, watts:151, label:"45m", hardPush:false },
  { date:"6/13", dist:"60m", pace:132.5, watts:150, label:"60m", hardPush:false },
];

export const RHR_BASELINE = 57;
export const HRV_BASELINE = 30;

export const NUTRITION_TARGETS = {
  "two-a-day": { cal:[3000,3500], protein:[185,200], carbs:[330,400], fat:[85,110] },
  "training":  { cal:[2900,3200], protein:[185,200], carbs:[310,370], fat:[80,100] },
  "rest":      { cal:[2400,2700], protein:[185,200], carbs:[230,290], fat:[70,90]  },
};

export const LIPID_REF = [
  { marker:"Total Cholesterol", unit:"mmol/L", target:"< 5.5",  color:"#00d4ff" },
  { marker:"LDL ('bad')",       unit:"mmol/L", target:"< 2.0",  color:"#ff6b35" },
  { marker:"HDL ('good')",      unit:"mmol/L", target:"> 1.0",  color:"#34d399" },
  { marker:"Triglycerides",     unit:"mmol/L", target:"< 1.7",  color:"#ffd700" },
];

export const HORMONE_REF = [
  { marker:"Total Testosterone", note:"Core marker. Morning draw essential — peaks early AM." },
  { marker:"Free Testosterone",  note:"The bioavailable fraction — what's actually usable." },
  { marker:"SHBG",               note:"Binds testosterone; affects free levels." },
  { marker:"LH / FSH",           note:"Pituitary signals — locate where any issue sits (testicular vs central)." },
  { marker:"Oestradiol",         note:"If indicated. Balance matters, not just testosterone." },
];
