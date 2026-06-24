import { MICROCYCLE, ROSTER_ANCHOR, SESSION_OVERRIDES } from "../constants/program.js";

export function getRosterMode(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const anchor = new Date(ROSTER_ANCHOR.getFullYear(), ROSTER_ANCHOR.getMonth(), ROSTER_ANCHOR.getDate());
  const daysDiff = Math.floor((d - anchor) / 86400000);
  if (daysDiff < 0) return "home";
  const weekNum = Math.floor(daysDiff / 7);
  return weekNum % 2 === 0 ? "fifo" : "home";
}

export function resolveDay(date) {
  const iso = date.getFullYear() + "-" + String(date.getMonth()+1).padStart(2,"0") + "-" + String(date.getDate()).padStart(2,"0");
  if (SESSION_OVERRIDES[iso]) return SESSION_OVERRIDES[iso];
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const cycle = MICROCYCLE[getRosterMode(date)] || MICROCYCLE.home;
  return cycle.days.find(x => x.day === dayNames[date.getDay()]);
}

export function logEntriesForDate(date, sessions) {
  const key = (date.getMonth()+1) + "/" + date.getDate() + "/" + String(date.getFullYear()).slice(-2);
  return (sessions || []).filter(e => e.date === key);
}

export function dayStatus(date, todayMidnight, sessions) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const logged = logEntriesForDate(d, sessions);
  if (logged.length > 0) return { state:"done", logged };
  if (d.getTime() === todayMidnight.getTime()) return { state:"today", logged:[] };
  if (d < todayMidnight) return { state:"missed", logged:[] };
  return { state:"upcoming", logged:[] };
}

export function getToday(cycleMode) {
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const now = new Date();
  const todayKey = days[now.getDay()];
  const cycle = MICROCYCLE[cycleMode] || MICROCYCLE.home;
  const today = resolveDay(now);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const next = resolveDay(tomorrow);
  const dateStr = now.toLocaleDateString("en-AU", { weekday:"long", day:"numeric", month:"short" });
  return { todayKey, today, next, dateStr, cycleLabel: cycle.label, cycleColor: cycle.color };
}

export function getUpcomingSessions(now, sessions) {
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const ERG_HOUR = 6, STRENGTH_HOUR = 16;
  const isStrength = txt => txt && /lower|upper|strength|day 1|day 2/i.test(txt);
  const out = [];
  for (let i = 0; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const dow = dayNames[d.getDay()];
    const sess = resolveDay(d);
    if (!sess) continue;
    if (logEntriesForDate(d, sessions).length > 0) continue;
    if (sess.am && sess.am !== "—") {
      const t = new Date(d); t.setHours(isStrength(sess.am) ? STRENGTH_HOUR : ERG_HOUR, 0, 0, 0);
      if (t > now) out.push({ when:t, label:sess.am, slot:isStrength(sess.am)?"PM slot":"AM slot", dow });
    }
    if (sess.pm && sess.pm !== "—") {
      const t = new Date(d); t.setHours(STRENGTH_HOUR, 0, 0, 0);
      if (t > now) out.push({ when:t, label:sess.pm, slot:"PM slot", dow });
    }
  }
  out.sort((a,b) => a.when - b.when);
  return out.slice(0, 3);
}

export function daySessions(day) {
  if (!day) return [];
  const out = [];
  if (day.am && day.am !== "—") out.push({ label:day.am, slot:"AM", note:day.amNote || day.note, fuel:day.amFuel || day.fuel, meal:day.amMeal || day.meal });
  if (day.pm && day.pm !== "—" && day.pm !== "Rest") out.push({ label:day.pm, slot:"PM", note:day.pmNote || day.note, fuel:day.pmFuel || day.fuel, meal:day.pmMeal || day.meal });
  return out;
}
