export function assessMacro(val, range) {
  if (typeof val !== "number" || !Array.isArray(range) || range.length < 2) return "—";
  if (val >= range[0] && val <= range[1]) return "✅";
  if (val < range[0]) return val >= range[0] * 0.9 ? "⚠️" : "❌";
  return val <= range[1] * 1.15 ? "⚠️" : "❌";
}

export function macroColor(status) {
  return status === "✅" ? "#34d399" : status === "⚠️" ? "#ffd700" : "#ff2d55";
}

export function bpCategory(sys, dia) {
  if (typeof sys !== "number" || typeof dia !== "number" ||
      sys < 60 || sys > 260 || dia < 30 || dia > 160 || dia >= sys) {
    return { label:"Check reading", color:"#888" };
  }
  if (sys < 120 && dia < 80) return { label:"Optimal", color:"#34d399" };
  if (sys < 130 && dia < 80) return { label:"Normal", color:"#34d399" };
  if (sys < 140 || dia < 90) return { label:"High-normal", color:"#ffd700" };
  return { label:"Elevated — note for GP", color:"#ff6b35" };
}
