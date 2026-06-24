import { RHR_BASELINE, HRV_BASELINE } from "../constants/training.js";

export const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
export const std  = arr => { const m = mean(arr); return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1)); };

export function analyzeBarometer(points) {
  const actual = points.filter(p => p.type === "actual" && !p.setupArtifact);
  if (actual.length < 3) return null;
  const epoch = new Date("2026/" + actual[0].date).getTime();
  const xs = actual.map(p => (new Date("2026/" + p.date).getTime() - epoch) / 86400000);
  const ys = actual.map(p => p.watts);
  const n = xs.length;
  const mx = mean(xs), my = mean(ys);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i]-mx)*(ys[i]-my); den += (xs[i]-mx)**2; }
  const slope = den === 0 ? 0 : num/den;
  const intercept = my - slope*mx;
  const preds = xs.map(x => slope*x + intercept);
  const ssRes = ys.reduce((s,y,i) => s + (y-preds[i])**2, 0);
  const ssTot = ys.reduce((s,y) => s + (y-my)**2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes/ssTot;
  const residSd = n > 2 ? Math.sqrt(ssRes/(n-2)) : 0;
  const currentLevel = Math.round(my);
  const spread = +std(ys).toFixed(1);
  let verdict;
  if (r2 < 0.5 || Math.abs(slope*7) < 2) verdict = "PLATEAU — engine settled at ~" + currentLevel + "W (low R² + tight spread = a real repeatable level, not still climbing). Expected late-base; the gain is banked. Next real signal = end-of-base 5k.";
  else if (slope*7 >= 2) verdict = "STILL RISING (~" + (+(slope*7).toFixed(1)) + "W/wk) — but early gains decelerate; don't extrapolate linearly.";
  else verdict = "DIPPING — watch fatigue/consistency, recheck on a fresh clean anchor.";
  return {
    slopePerWeek: +(slope*7).toFixed(1),
    r2: +r2.toFixed(2),
    residSd: +residSd.toFixed(1),
    spread,
    nPoints: n,
    currentLevel,
    verdict,
  };
}

export function calcTrainingLoad(tssData) {
  const CTL_K = Math.exp(-1/42);
  const ATL_K = Math.exp(-1/7);
  const tssMap = {};
  tssData.forEach(d => { tssMap[d.date] = { tss: d.tss, note: d.note }; });

  const start = new Date(tssData[0].date);
  const end   = new Date("2026-06-13");
  const results = [];
  let ctl = 0, atl = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key  = d.toISOString().split("T")[0];
    const day  = tssMap[key];
    const tss  = day ? day.tss : 0;
    ctl = ctl * CTL_K + tss * (1 - CTL_K);
    atl = atl * ATL_K + tss * (1 - ATL_K);
    results.push({
      date: key.slice(5).replace("-","/"),
      ctl:  Math.round(ctl  * 10) / 10,
      atl:  Math.round(atl  * 10) / 10,
      tsb:  Math.round((ctl - atl) * 10) / 10,
      tss,
      note: day ? day.note : "",
    });
  }
  return results;
}

export function calcReadiness(day, tsb) {
  if (!day || typeof day.rhr !== "number") {
    return { score: null, status: "NO DATA", color: "#888", partial: true };
  }
  let score = 100;
  const rhrDelta = day.rhr - RHR_BASELINE;
  if (rhrDelta > 0) score -= rhrDelta * 4;
  if (day.hrv != null) {
    const hrvDelta = HRV_BASELINE - day.hrv;
    if (hrvDelta > 0) score -= hrvDelta * 1.5;
  }
  if (day.sleep != null && day.sleep < 7) score -= (7 - day.sleep) * 8;
  if (tsb < -20) score -= (Math.abs(tsb) - 20) * 0.8;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const status = score >= 75 ? "READY" : score >= 50 ? "CAUTION" : "REST";
  const color  = score >= 75 ? "#34d399" : score >= 50 ? "#ffd700" : "#ff2d55";
  const partial = (day.hrv == null || day.sleep == null);
  return { score, status, color, partial };
}

export function evaluateRules(recovery, recentSrpe, tsb) {
  const flags = [];
  if (!recovery) return flags;
  if (recovery.hrv != null && recovery.hrv < HRV_BASELINE && recovery.rhr > RHR_BASELINE) {
    flags.push({ id:"R4", msg:"HRV below baseline + RHR up — under-recovered. Soften next hard session." });
  }
  if (recovery.sleep != null && recovery.sleep < 7) {
    flags.push({ id:"R5", msg:`Sleep ${recovery.sleep}h < 7h target. Protect bedtime tonight.` });
  }
  if (recentSrpe != null && recentSrpe >= 7) {
    flags.push({ id:"R3", msg:`Last session sRPE ${recentSrpe} — above easy/aerobic target. Watch for a trend.` });
  }
  if (tsb != null && tsb < -25) {
    flags.push({ id:"R4", msg:`TSB ${tsb} — meaningfully fatigued. Favour recovery.` });
  }
  return flags;
}

export function checkConsistency(firedRules, plannedIsHard) {
  const recoveryFired = firedRules.some(f => f.id === "R4");
  if (recoveryFired && plannedIsHard) {
    return { conflict:true, msg:"⚠️ Engine flags under-recovery (R4) but a hard session is planned. Reconcile — favour the body." };
  }
  return { conflict:false };
}

export function deriveTargets(hr130Series) {
  const clean = hr130Series.filter(p => p.type === "actual");
  const anchor = clean.length ? clean[clean.length - 1].watts : 150;
  return {
    anchor,
    ut1Low:  Math.round(anchor * 0.96),
    ut1High: Math.round(anchor * 1.02),
    ut2Low:  Math.round(anchor * 0.83),
    ut2High: Math.round(anchor * 0.90),
    pacerCue: anchor,
    source: clean.length ? `${clean.length} clean HR130 points, latest ${anchor}W` : "default (no clean points)",
  };
}

export function autoregulate(tsb, readiness, firedRules) {
  const hardFlag = firedRules.some(f => f.id === "R4");
  let signal, color, guidance;

  if (hardFlag || (tsb != null && tsb < -25) || (readiness && readiness.score != null && readiness.score < 50)) {
    signal = "RED"; color = "#ff2d55";
    guidance = "Ease or swap to recovery. The body's signalling fatigue louder than the plan. Quality work won't land well today.";
  } else if ((tsb != null && tsb < -10) || (readiness && readiness.score != null && readiness.score < 75) ||
             firedRules.some(f => f.id === "R5")) {
    signal = "AMBER"; color = "#ffd700";
    guidance = "Proceed, but hold the easy end genuinely easy. Don't add intensity. Keep quality sessions controlled, not maximal.";
  } else {
    signal = "GREEN"; color = "#34d399";
    guidance = "Clear to train as planned. Form and recovery support it — if it's a quality day, you can commit to it.";
  }
  return { signal, color, guidance };
}
