// Pure, dependency-free parser for the stacked "Health Data Export" CSV.
// The sheet publishes ALL sections into one tab; we segment by header signature
// and map per the VITALS_IMPORT field rule. No Supabase imports here so it can
// be unit-tested outside Deno.

export type VitalRecord = {
  date: string;            // YYYY-MM-DD
  rhr_bpm: number | null;
  hrv_ms: number | null;
  sleep_hours: number | null;
  bodyweight_kg: number | null;
};

// --- minimal RFC-4180-ish CSV line splitter (handles quoted commas) ---
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

const num = (v: string | undefined): number | null => {
  if (v == null) return null;
  const s = v.trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const isoDate = (v: string | undefined): string | null => {
  if (!v) return null;
  const m = v.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
};
const round = (n: number | null): number | null => (n == null ? null : Math.round(n));

// Header signatures that mark the start of each section.
const SIG = {
  vitals: (h: string[]) => h.includes("Heart rate variability avg (ms)") && h.includes("Resting heart rate avg (bpm)"),
  sleep:  (h: string[]) => h.includes("Light Sleep (min)") && h.includes("Deep Sleep (min)") && h.includes("REM Sleep (min)"),
  weight: (h: string[]) => h.includes("Weight (kg)"),
};

export function buildRecords(csv: string): VitalRecord[] {
  const lines = csv.split(/\r?\n/);
  const byDate: Record<string, VitalRecord> = {};
  const ensure = (d: string): VitalRecord =>
    (byDate[d] ??= { date: d, rhr_bpm: null, hrv_ms: null, sleep_hours: null, bodyweight_kg: null });

  let section: "vitals" | "sleep" | "weight" | null = null;
  let col: Record<string, number> = {};
  const idx = (row: string[], name: string) => { const i = col[name]; return i == null ? undefined : row[i]; };

  for (const raw of lines) {
    if (raw.trim() === "") { section = null; continue; }
    const cells = splitCsvLine(raw);
    // header detection
    if (SIG.vitals(cells)) { section = "vitals"; col = {}; cells.forEach((c, i) => col[c] = i); continue; }
    if (SIG.sleep(cells))  { section = "sleep";  col = {}; cells.forEach((c, i) => col[c] = i); continue; }
    if (SIG.weight(cells)) { section = "weight"; col = {}; cells.forEach((c, i) => col[c] = i); continue; }
    if (!section) continue; // activity / nutrition / preamble — ignore

    if (section === "vitals") {
      const d = isoDate(idx(cells, "Date")); if (!d) continue;
      const r = ensure(d);
      const hrv = round(num(idx(cells, "Heart rate variability avg (ms)")));
      const rhr = round(num(idx(cells, "Resting heart rate avg (bpm)")));
      if (hrv != null && r.hrv_ms == null) r.hrv_ms = hrv;   // skip Concept2 rows (blank HRV/RHR)
      if (rhr != null && r.rhr_bpm == null) r.rhr_bpm = rhr;
    } else if (section === "sleep") {
      const d = isoDate(idx(cells, "Date")); if (!d) continue;
      const r = ensure(d);
      const total = (num(idx(cells, "Light Sleep (min)")) ?? 0)
                  + (num(idx(cells, "Deep Sleep (min)")) ?? 0)
                  + (num(idx(cells, "REM Sleep (min)")) ?? 0); // Awake excluded
      if (total > 0) {
        const hours = +(total / 60).toFixed(2);
        r.sleep_hours = r.sleep_hours == null ? hours : Math.max(r.sleep_hours, hours); // double-row -> max total
      }
    } else if (section === "weight") {
      const d = isoDate(idx(cells, "Date/Time") ?? idx(cells, "Date")); if (!d) continue;
      const r = ensure(d);
      const w = num(idx(cells, "Weight (kg)"));
      if (w != null) r.bodyweight_kg = w; // latest that day wins (rows in date order)
    }
  }
  // keep only dates that carry at least one mapped value
  return Object.values(byDate).filter(r =>
    r.rhr_bpm != null || r.hrv_ms != null || r.sleep_hours != null || r.bodyweight_kg != null);
}
