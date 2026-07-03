import { MICROCYCLE } from '../constants/schedule.js';

// ── ROSTER AUTO-SWITCH — home vs FIFO by date ─────────────────
// FIFO is 1wk-on/1wk-off. Anchor on a KNOWN boundary: Scott flies
// out Tue 2026-06-23 = FIFO week starts. From there, alternate every
// 7 days. Weeks are computed as whole-week offsets from the anchor.
// NOTE: Scott had an extra home week for family before this, so we
// DON'T extrapolate backward past the anchor — only forward from it.
// If the roster pattern changes, update ROSTER_ANCHOR.
export const ROSTER_ANCHOR = new Date(2026, 5, 23); // Tue 23 Jun 2026 — FIFO begins (fly out)
export function getRosterMode(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const anchor = new Date(
    ROSTER_ANCHOR.getFullYear(),
    ROSTER_ANCHOR.getMonth(),
    ROSTER_ANCHOR.getDate()
  );
  const daysDiff = Math.floor((d - anchor) / 86400000);
  if (daysDiff < 0) return 'home'; // before the anchor = current home week
  // From anchor: week 0 = FIFO, week 1 = home, week 2 = FIFO, ...
  const weekNum = Math.floor(daysDiff / 7);
  return weekNum % 2 === 0 ? 'fifo' : 'home';
}

// ── SESSION OVERRIDES — one-off changes on top of the template ─
// A date-keyed override replaces the microcycle template for that
// ONE day only — the repeating template is untouched (next Friday
// is still erg + Lower 2). Use for autoregulation calls: swaps,
// combined sessions, deliberate skips. Key = "YYYY-MM-DD".
export const SESSION_OVERRIDES = {
  '2026-07-01': {
    day: 'Wed',
    override: true,
    am: '🎯 CP TEST #1 — 4-min all-out',
    pm: '—',
    amNote:
      "KEYSTONE TEST (fresh legs, post-FIFO taper — the whole point of waiting). PROTOCOL: thorough warm-up (15-20min building, 3×10-15s bursts to open up, full recovery before starting), then 4 MINUTES ALL-OUT at fixed drag 125. PACING — this is the trap: don't fire off at cycling-FTP instinct. Target a HARD-but-holdable opening (think ~105-108% of your est. CP ~190W, so ~200-205W) and hold/build — a mispaced fade ruins the number. Better to finish with a tiny bit left than blow up at 2:30. Average power over the full 4min is the headline; we'll also note the last-30s power. Log to C2 ranking. WHY 4-min not 3MT: pace-able for a first rowing test (the 3MT's all-out-from-gun is hard to pace blind + only moderately reliable in trained rowers). This is anchor #1 — test #2 next home week completes the CP+W′ model. READINESS GATE: if you arrive home flat from a rough swing, push it a day. Test fresh or don't test.",
    amFuel:
      "Fuel this one PROPERLY — it's a maximal effort, not a fasted base row. Day target ~3,000 cal · 200g protein · ~350g carbs. The test is the exception to the fasted-AM default.",
    meal: {
      pre: "EXCEPTION to fasted-AM — a max test wants fuel. ~40-60g fast carbs 60-90min before (oats/banana/toast), low fat, plus the latte. Carbohydrate-replete + hydrated = the test conditions the research uses. Don't test fasted; you'll under-read.",
      post: '~60g carbs + 30-40g protein within 30-60min. Hard effort = real glycogen cost.',
    },
  },
  '2026-06-19': {
    day: 'Fri',
    override: true,
    am: 'Combined Strength — Lower 2 (RDL-led) → Upper 1',
    pm: '—',
    amNote:
      "ONE-OFF SWAP (heavy rowing week — 6 straight days on the erg). The 45min UT1 is swapped for Upper 1, combined with Lower 2 as one large session. Breaks the consecutive-rowing chain, redistributes load to a different system without cutting work. SEQUENCE (order matters): (1) Mobility prep first — glute activation, the rehab area follows. (2) LOWER 2 FIRST while fresh — RDL rehab + power. This is the priority + the most form-demanding; do it before fatigue degrades control. Don't grind it tired. (3) UPPER 1 second — press, pull, accessories; upper absorbs being second fine. WATCH: it'll run 75-90+min. If form or focus fades in the back half, cut accessories — trim, don't grind junk volume. Morning readiness check first: legs may still carry Wed's squat (Lower 1 was 6/17) — if the posterior chain is cooked, the rehab RDLs are the thing to protect, so reduce load or split.",
    amFuel:
      "Big combined-strength day. Day target ~3,200 cal · 200g protein · ~395g carbs (treat like a two-a-day — it is one, just stacked). Fuel properly BEFORE: carb meal ~2hr prior so the RDLs aren't done glycogen-depleted (rehab form needs fuel). Protein around the session. Creatine with a meal. Refuel within 30-60min after — this is a long block.",
    meal: {
      pre: "FASTED is your default — just the soy latte is fine (the few g of soy protein won't hurt). HONEST CALL for a heavy AM lift: the RDLs are better with some fuel, BUT if you train fasted reliably and feel strong, do that — don't force a meal you won't eat. Compromise if you want it: ~30-40g fast carbs 20-30min before (banana, a few dates, or carbs in the latte) — small, just tops the tank for the rehab work without sitting heavy. Skip if fasted feels fine.",
      post: "THE meal that matters for you. ~60-80g carbs + 40g protein within 30-60min. This is where the day's fuelling lands — you trained fasted, so refuel properly after the long block.",
    },
  },
};
export function resolveDay(date) {
  const iso =
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0');
  if (SESSION_OVERRIDES[iso]) return SESSION_OVERRIDES[iso];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cycle = MICROCYCLE[getRosterMode(date)] || MICROCYCLE.home;
  return cycle.days.find((x) => x.day === dayNames[date.getDay()]);
}

// ── COMPLETION STATUS — match a calendar day to the session log ─
// A planned day is "done" if the session list has any entry on that date.
// Takes the session list as a param so it works with the MERGED list
// (hardcoded seed history + live sessions fetched from Supabase).
export function logEntriesForDate(date, sessions) {
  // session dates are "M/D/YY" (e.g. "6/19/26")
  const key =
    date.getMonth() +
    1 +
    '/' +
    date.getDate() +
    '/' +
    String(date.getFullYear()).slice(-2);
  return (sessions || []).filter((e) => e.date === key);
}
export function dayStatus(date, todayMidnight, sessions) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const logged = logEntriesForDate(d, sessions);
  if (logged.length > 0) return { state: 'done', logged };
  if (d.getTime() === todayMidnight.getTime())
    return { state: 'today', logged: [] };
  if (d < todayMidnight) return { state: 'missed', logged: [] }; // past, nothing logged
  return { state: 'upcoming', logged: [] };
}

// ── LIVE "TODAY" HELPER — makes the dashboard date-aware ───────
// Computes today's weekday + pulls the matching microcycle session
// so the status strip shows where you actually are, live.
export function getToday(cycleMode) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  const todayKey = days[now.getDay()];
  const cycle = MICROCYCLE[cycleMode] || MICROCYCLE.home;
  const today = resolveDay(now); // override-aware
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );
  const next = resolveDay(tomorrow); // override-aware
  const dateStr = now.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  return {
    todayKey,
    today,
    next,
    dateStr,
    cycleLabel: cycle.label,
    cycleColor: cycle.color,
  };
}

// ── NEXT-SESSION COUNTDOWN — live "time until" each upcoming slot ─
// Honest framing: sessions don't have exact clock times, so anchor
// to DEFAULT slots (erg 06:00, strength 16:00). Scans forward up to
// 3 days, computing roster mode PER DAY so it handles the home↔FIFO
// boundary correctly (e.g. Sunday before fly-out shows FIFO sessions).
export function getUpcomingSessions(now, sessions) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const ERG_HOUR = 6,
    STRENGTH_HOUR = 16; // default slots
  const isStrength = (txt) =>
    txt && /lower|upper|strength|day 1|day 2/i.test(txt);
  const out = [];
  for (let i = 0; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const dow = dayNames[d.getDay()];
    const sess = resolveDay(d); // override-aware (one-off swaps respected)
    if (!sess) continue;
    // If the day already has logged work, it's done — don't list it as upcoming.
    if (logEntriesForDate(d, sessions).length > 0) continue;
    if (sess.am && sess.am !== '—') {
      const t = new Date(d);
      t.setHours(isStrength(sess.am) ? STRENGTH_HOUR : ERG_HOUR, 0, 0, 0);
      if (t > now)
        out.push({
          when: t,
          label: sess.am,
          slot: isStrength(sess.am) ? 'PM slot' : 'AM slot',
          dow,
        });
    }
    if (sess.pm && sess.pm !== '—') {
      const t = new Date(d);
      t.setHours(STRENGTH_HOUR, 0, 0, 0);
      if (t > now) out.push({ when: t, label: sess.pm, slot: 'PM slot', dow });
    }
  }
  out.sort((a, b) => a.when - b.when);
  return out.slice(0, 3);
}

// ── SESSION SPLIT — one box per session, each with its own detail ─
// Split a day into its individual sessions (one per box), each with
// its OWN note + fuel (per-session detail). Falls back to legacy
// day-level note/fuel if per-slot fields aren't present.
export function daySessions(day) {
  if (!day) return [];
  const out = [];
  if (day.am && day.am !== '—')
    out.push({
      label: day.am,
      slot: 'AM',
      note: day.amNote || day.note,
      fuel: day.amFuel || day.fuel,
      meal: day.amMeal || day.meal,
    });
  if (day.pm && day.pm !== '—' && day.pm !== 'Rest')
    out.push({
      label: day.pm,
      slot: 'PM',
      note: day.pmNote || day.note,
      fuel: day.pmFuel || day.fuel,
      meal: day.pmMeal || day.meal,
    });
  return out; // empty = rest day (no session boxes)
}
