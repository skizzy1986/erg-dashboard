import { C } from "../constants/palette.js";

export function normType(t, label = "") {
  if (C[t]) return t;
  const lt = (t || "").toLowerCase();
  const ll = (label || "").toLowerCase();
  if (lt === "erg") return "Z2 Aerobic";
  if (lt === "strength") {
    if (/upper/.test(ll)) return "Upper Strength";
    if (/lower/.test(ll)) return "Lower Strength";
    return "Combined";
  }
  if (lt === "cycling" || lt === "bike" || lt === "ride") return "Cycling";
  if (lt === "mobility" || lt === "rest") return "Rest";
  return t;
}

export function fmtPace(secs) {
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(1).padStart(4,"0");
  return `${m}:${s}`;
}

export function workoutAccent(txt) {
  if(!txt) return "#3a3a4a";
  const t = txt.toLowerCase();
  if(t.includes("lower")) return "#34d399";
  if(t.includes("upper")) return "#a78bfa";
  if(t.includes("rate ladder")||t.includes("threshold")) return "#ffd700";
  if(t.includes("interval")||t.includes("vo")) return "#ff6b35";
  if(t.includes("yoga")||t.includes("foam")||t.includes("rest")) return "#3a3a4a";
  return "#00d4ff";
}
