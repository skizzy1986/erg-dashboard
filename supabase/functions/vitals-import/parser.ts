// Pure, dependency-free parser for the Health Data Export multi-tab CSVs.
// Three separate CSVs (Vitals, Sleep, Body Measurements) are each parsed with
// known column schemas and merged by date into VitalRecord objects.
// No Supabase imports here so it can be unit-tested outside Deno.

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

// Handles both YYYY-MM-DD and DD/MM/YYYY (Australian Health Data Export format).
export const isoDate = (v: string | undefined): string | null => {
  if (!v) return null;
  const s = v.trim();
  let m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
};

const round = (n: number | null): number | null => (n == null ? null : Math.round(n));

// Build a column-name→index map from a parsed header row.
const colMap = (cells: string[]): Record<string, number> => {
  const m: Record<string, number> = {};
  cells.forEach((c, i) => (m[c] = i));
  return m;
};
const idx = (row: string[], col: Record<string, number>, name: string): string | undefined => {
  const i = col[name];
  return i == null ? undefined : row[i];
};

function parseVitals(csv: string, ensure: (d: string) => VitalRecord): void {
  const lines = csv.split(/\r?\n/);
  if (lines.length < 2) return;
  const col = colMap(splitCsvLine(lines[0]));
  for (const raw of lines.slice(1)) {
    if (raw.trim() === "") continue;
    const cells = splitCsvLine(raw);
    const d = isoDate(idx(cells, col, "Date")); if (!d) continue;
    const r = ensure(d);
    const hrv = round(num(idx(cells, col, "Heart rate variability avg (ms)")));
    const rhr = round(num(idx(cells, col, "Resting heart rate avg (bpm)")));
    if (hrv != null && r.hrv_ms == null) r.hrv_ms = hrv;   // skip Concept2 rows (blank HRV/RHR)
    if (rhr != null && r.rhr_bpm == null) r.rhr_bpm = rhr;
  }
}

function parseSleep(csv: string, ensure: (d: string) => VitalRecord): void {
  const lines = csv.split(/\r?\n/);
  if (lines.length < 2) return;
  const col = colMap(splitCsvLine(lines[0]));
  for (const raw of lines.slice(1)) {
    if (raw.trim() === "") continue;
    const cells = splitCsvLine(raw);
    const d = isoDate(idx(cells, col, "Date")); if (!d) continue;
    const r = ensure(d);
    const total = (num(idx(cells, col, "Light Sleep (min)")) ?? 0)
                + (num(idx(cells, col, "Deep Sleep (min)")) ?? 0)
                + (num(idx(cells, col, "REM Sleep (min)")) ?? 0); // Awake excluded
    if (total > 0) {
      const hours = +(total / 60).toFixed(2);
      r.sleep_hours = r.sleep_hours == null ? hours : Math.max(r.sleep_hours, hours); // double-row -> max total
    }
  }
}

function parseWeight(csv: string, ensure: (d: string) => VitalRecord): void {
  const lines = csv.split(/\r?\n/);
  if (lines.length < 2) return;
  const col = colMap(splitCsvLine(lines[0]));
  for (const raw of lines.slice(1)) {
    if (raw.trim() === "") continue;
    const cells = splitCsvLine(raw);
    // Body Measurements tab uses "Date/Time"; fall back to "Date" defensively.
    const d = isoDate(idx(cells, col, "Date/Time") ?? idx(cells, col, "Date")); if (!d) continue;
    const r = ensure(d);
    const w = num(idx(cells, col, "Weight (kg)"));
    if (w != null) r.bodyweight_kg = w; // latest that day wins (rows in date order)
  }
}

export function buildRecords(vitalsCsv: string, sleepCsv: string, weightCsv: string): VitalRecord[] {
  const byDate: Record<string, VitalRecord> = {};
  const ensure = (d: string): VitalRecord =>
    (byDate[d] ??= { date: d, rhr_bpm: null, hrv_ms: null, sleep_hours: null, bodyweight_kg: null });

  parseVitals(vitalsCsv, ensure);
  parseSleep(sleepCsv, ensure);
  parseWeight(weightCsv, ensure);

  return Object.values(byDate).filter(r =>
    r.rhr_bpm != null || r.hrv_ms != null || r.sleep_hours != null || r.bodyweight_kg != null);
}
