/* ═══════════════════════════════════════════════════════════════
   STRENGTH LOGGER · v1 (Strong/Jefit-style direct logging)
   ───────────────────────────────────────────────────────────────
   • 873-exercise library (Supabase `exercises`, free-exercise-db)
   • Animated movement demos (alternates the 2 still frames → GIF feel)
   • Set / rep / weight steppers with live volume + Epley e1RM
   • Persists to strength_workouts + strength_sets (owner-scoped RLS)
   • On "Finish", a DB trigger rolls the workout up into `sessions`
     so it lands in the dashboard calendar + Strength view + analytics
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "./supabaseClient.js";

// free-exercise-db image host (relative paths stored in catalog)
const IMG_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const imgUrl = (p) => (p ? IMG_BASE + p : null);

// session types → must match the dashboard colour map keys
const SESSION_TYPES = [
  { key: "Lower Strength", color: "#34d399" },
  { key: "Upper Strength", color: "#a78bfa" },
  { key: "Combined",       color: "#f472b6" },
];
const MUSCLES = ["abdominals","abductors","adductors","biceps","calves","chest","forearms",
  "glutes","hamstrings","lats","lower back","middle back","neck","quadriceps","shoulders","traps","triceps"];
const EQUIPMENT = ["barbell","dumbbell","cable","machine","body only","kettlebells","bands",
  "e-z curl bar","exercise ball","medicine ball","foam roll","other"];

// ── UI palette (dark, matches dashboard) ───────────────────────
const UI = {
  bg:"#08080d", panel:"#2a2a48", card:"#1e1e30", field:"#08080d",
  border:"#4a4a68", line:"#3e3e5a", accent:"#34d399", cyan:"#00d4ff",
  text:"#e8e8f0", muted:"#7e7e9a", dim:"#6c6c88", warn:"#ffd700", err:"#ff2d55",
};
const mono = "'DM Mono','Courier New',monospace";

// Epley e1RM
const e1rm = (w, r) => (w && r ? w * (1 + r / 30) : 0);
const round1 = (n) => Math.round(n * 10) / 10;
const fmtKg = (n) => (n == null ? "—" : Number(n).toLocaleString() + "kg");
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10); };

// ── ANIMATED DEMO (alternates the two still frames) ────────────
function AnimatedDemo({ images, size = 150, playing = true }) {
  const [frame, setFrame] = useState(0);
  const frames = images && images.length ? images : [];
  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), 1100);
    return () => clearInterval(t);
  }, [playing, frames.length]);
  if (!frames.length) {
    return <div style={{ width:size, height:size, background:UI.field, border:`1px solid ${UI.line}`,
      borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:UI.dim, fontSize:9 }}>NO IMAGE</div>;
  }
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      {frames.map((p, i) => (
        <img key={i} src={imgUrl(p)} alt="" loading="lazy"
          style={{ position:"absolute", inset:0, width:size, height:size, objectFit:"cover",
            borderRadius:8, border:`1px solid ${UI.line}`, background:"#fff",
            opacity: i === frame ? 1 : 0, transition:"opacity .35s" }} />
      ))}
    </div>
  );
}

// ── EXERCISE PICKER (modal) ────────────────────────────────────
function ExercisePicker({ catalog, onPick, onClose }) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equip, setEquip] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return catalog.filter((e) => {
      if (term && !e.name.toLowerCase().includes(term)) return false;
      if (muscle && !(e.primary_muscles || []).includes(muscle)) return false;
      if (equip && e.equipment !== equip) return false;
      return true;
    }).slice(0, 300);
  }, [catalog, q, muscle, equip]);

  const chip = (active) => ({
    background: active ? UI.accent : "transparent", color: active ? UI.bg : UI.muted,
    border: `1px solid ${active ? UI.accent : UI.border}`, borderRadius: 20,
    padding: "4px 10px", fontSize: 9, cursor: "pointer", fontFamily: mono, whiteSpace: "nowrap",
  });

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"#000000cc", zIndex:2000,
      display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div onClick={(e)=>e.stopPropagation()} style={{ width:"100%", maxWidth:680, maxHeight:"88vh",
        background:UI.panel, border:`1px solid ${UI.border}`, borderRadius:"12px 12px 0 0",
        display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"14px 14px 8px", borderBottom:`1px solid ${UI.line}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:11, letterSpacing:2, color:UI.accent, fontWeight:700 }}>ADD EXERCISE · {catalog.length} IN LIBRARY</div>
            <button onClick={onClose} style={{ background:"none", border:"none", color:UI.muted, fontSize:18, cursor:"pointer" }}>✕</button>
          </div>
          <input autoFocus value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search 873 exercises…"
            style={{ width:"100%", boxSizing:"border-box", background:UI.field, border:`1px solid ${UI.border}`,
              borderRadius:6, padding:"10px 12px", color:UI.text, fontSize:13, fontFamily:mono, marginBottom:8 }} />
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:6, marginBottom:4 }}>
            <span style={chip(!muscle)} onClick={()=>setMuscle("")}>ALL MUSCLES</span>
            {MUSCLES.map((m)=>(<span key={m} style={chip(muscle===m)} onClick={()=>setMuscle(muscle===m?"":m)}>{m}</span>))}
          </div>
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
            <span style={chip(!equip)} onClick={()=>setEquip("")}>ALL GEAR</span>
            {EQUIPMENT.map((m)=>(<span key={m} style={chip(equip===m)} onClick={()=>setEquip(equip===m?"":m)}>{m}</span>))}
          </div>
        </div>
        <div style={{ overflowY:"auto", padding:"6px 8px" }}>
          {results.length === 0 && <div style={{ padding:24, textAlign:"center", color:UI.muted, fontSize:11 }}>No matches.</div>}
          {results.map((e)=>(
            <div key={e.id} onClick={()=>onPick(e)} style={{ display:"flex", gap:10, alignItems:"center",
              padding:"8px 6px", borderBottom:`1px solid ${UI.line}`, cursor:"pointer" }}>
              <img src={imgUrl((e.images||[])[0])} alt="" loading="lazy"
                style={{ width:46, height:46, objectFit:"cover", borderRadius:6, background:"#fff", flexShrink:0 }} />
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ fontSize:12, color:UI.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.name}</div>
                <div style={{ fontSize:9, color:UI.muted, marginTop:2 }}>
                  {(e.primary_muscles||[]).join(", ")} · {e.equipment || "—"}
                </div>
              </div>
              <span style={{ color:UI.accent, fontSize:16, flexShrink:0 }}>＋</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── STEPPER (number with +/-) ──────────────────────────────────
function Stepper({ value, onChange, step = 1, label, suffix, width = 70 }) {
  const btn = { width:26, height:30, background:UI.field, border:`1px solid ${UI.border}`,
    color:UI.cyan, fontSize:16, lineHeight:"26px", cursor:"pointer", fontFamily:mono, flexShrink:0 };
  const num = (value === "" || value == null) ? "" : value;
  return (
    <div style={{ textAlign:"center" }}>
      {label && <div style={{ fontSize:8, color:UI.dim, letterSpacing:1, marginBottom:3 }}>{label}</div>}
      <div style={{ display:"flex", alignItems:"stretch" }}>
        <button type="button" style={{ ...btn, borderRadius:"5px 0 0 5px" }}
          onClick={()=>onChange(Math.max(0, round1((parseFloat(num)||0) - step)))}>−</button>
        <input value={num} inputMode="decimal" onChange={(e)=>onChange(e.target.value)}
          style={{ width, textAlign:"center", background:UI.field, border:`1px solid ${UI.border}`,
            borderLeft:"none", borderRight:"none", color:UI.text, fontSize:14, fontFamily:mono, padding:"0 2px" }} />
        <button type="button" style={{ ...btn, borderRadius:"0 5px 5px 0" }}
          onClick={()=>onChange(round1((parseFloat(num)||0) + step))}>＋</button>
      </div>
      {suffix && <div style={{ fontSize:8, color:UI.dim, marginTop:2 }}>{suffix}</div>}
    </div>
  );
}

// ── ONE EXERCISE BLOCK (demo + sets) ───────────────────────────
function ExerciseBlock({ ex, sets, onSets, onRemove }) {
  const [showDemo, setShowDemo] = useState(false);
  const update = (i, patch) => onSets(sets.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const addSet = () => {
    const last = sets[sets.length - 1] || { weight: "", reps: "" };
    onSets([...sets, { weight: last.weight, reps: last.reps, rpe: "", warmup: false, done: false }]);
  };
  const delSet = (i) => onSets(sets.filter((_, j) => j !== i));

  const vol = sets.reduce((a, s) => a + (s.warmup ? 0 : (parseFloat(s.weight)||0) * (parseInt(s.reps)||0)), 0);
  const best = sets.reduce((a, s) => s.warmup ? a : Math.max(a, e1rm(parseFloat(s.weight)||0, parseInt(s.reps)||0)), 0);

  return (
    <div style={{ background:UI.card, border:`1px solid ${UI.line}`, borderRadius:8, padding:"10px 12px", marginBottom:10 }}>
      <div style={{ display:"flex", gap:10 }}>
        <AnimatedDemo images={ex.images} size={56} playing />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
            <div style={{ fontSize:13, color:UI.text, fontWeight:700 }}>{ex.name}</div>
            <button onClick={onRemove} style={{ background:"none", border:"none", color:UI.dim, cursor:"pointer", fontSize:11 }}>remove</button>
          </div>
          <div style={{ fontSize:9, color:UI.muted, marginTop:2 }}>{(ex.primary_muscles||[]).join(", ")} · {ex.equipment}</div>
          <div style={{ display:"flex", gap:12, marginTop:5, fontSize:10 }}>
            <span style={{ color:UI.muted }}>vol <b style={{ color:UI.accent }}>{Math.round(vol).toLocaleString()}kg</b></span>
            <span style={{ color:UI.muted }}>e1RM <b style={{ color:UI.warn }}>{best ? round1(best)+"kg" : "—"}</b></span>
            <button onClick={()=>setShowDemo(s=>!s)} style={{ background:"none", border:"none", color:UI.cyan, cursor:"pointer", fontSize:10, padding:0 }}>
              {showDemo ? "hide how-to" : "how-to"}
            </button>
          </div>
        </div>
      </div>

      {showDemo && (
        <div style={{ display:"flex", gap:12, marginTop:10, paddingTop:10, borderTop:`1px solid ${UI.line}` }}>
          <AnimatedDemo images={ex.images} size={130} playing />
          <ol style={{ margin:0, paddingLeft:16, fontSize:10, color:UI.muted, lineHeight:1.5, maxHeight:130, overflowY:"auto" }}>
            {(ex.instructions||[]).map((t,i)=>(<li key={i} style={{ marginBottom:4 }}>{t}</li>))}
          </ol>
        </div>
      )}

      {/* sets header */}
      <div style={{ display:"grid", gridTemplateColumns:"26px 1fr 1fr 52px 34px 28px", gap:6, alignItems:"center",
        marginTop:10, fontSize:8, color:UI.dim, letterSpacing:1 }}>
        <span>SET</span><span style={{ textAlign:"center" }}>WEIGHT</span><span style={{ textAlign:"center" }}>REPS</span>
        <span style={{ textAlign:"center" }}>RPE</span><span></span><span></span>
      </div>
      {sets.map((s, i) => (
        <div key={i} style={{ display:"grid", gridTemplateColumns:"26px 1fr 1fr 52px 34px 28px", gap:6,
          alignItems:"center", marginTop:6, opacity: s.done ? 0.6 : 1 }}>
          <button onClick={()=>update(i,{warmup:!s.warmup})} title="toggle warm-up"
            style={{ background:"none", border:"none", cursor:"pointer", fontFamily:mono,
              color: s.warmup ? UI.warn : UI.muted, fontSize:11 }}>{s.warmup ? "W" : i+1}</button>
          <Stepper value={s.weight} step={2.5} onChange={(v)=>update(i,{weight:v})} width={48} />
          <Stepper value={s.reps} step={1} onChange={(v)=>update(i,{reps:v})} width={42} />
          <input value={s.rpe ?? ""} inputMode="decimal" placeholder="–" onChange={(e)=>update(i,{rpe:e.target.value})}
            style={{ width:46, textAlign:"center", background:UI.field, border:`1px solid ${UI.border}`,
              borderRadius:5, color:UI.text, fontSize:13, fontFamily:mono, padding:"6px 2px" }} />
          <button onClick={()=>update(i,{done:!s.done})} title="mark done"
            style={{ width:30, height:30, borderRadius:5, cursor:"pointer", fontSize:14,
              background: s.done ? UI.accent : UI.field, color: s.done ? UI.bg : UI.muted,
              border:`1px solid ${s.done ? UI.accent : UI.border}` }}>✓</button>
          <button onClick={()=>delSet(i)} style={{ background:"none", border:"none", color:UI.dim, cursor:"pointer", fontSize:14 }}>×</button>
        </div>
      ))}
      <button onClick={addSet} style={{ width:"100%", marginTop:8, background:"transparent",
        border:`1px dashed ${UI.border}`, color:UI.cyan, borderRadius:6, padding:"7px",
        fontSize:10, letterSpacing:1, cursor:"pointer", fontFamily:mono }}>＋ ADD SET</button>
    </div>
  );
}

// ── HISTORY / ANALYTICS ────────────────────────────────────────
function History() {
  const [prs, setPrs] = useState([]);
  const [vol, setVol] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, v, w] = await Promise.all([
        supabase.from("exercise_prs").select("*").order("best_e1rm_kg", { ascending: false }).limit(40),
        supabase.from("strength_volume_daily").select("*").order("workout_date", { ascending: true }),
        supabase.from("strength_workouts").select("*").eq("status","completed").order("workout_date", { ascending: false }).limit(30),
      ]);
      setPrs(p.data || []); setWorkouts(w.data || []);
      setVol((v.data || []).map(r => ({ date: r.workout_date.slice(5), vol: Number(r.total_volume_kg) })));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ color:UI.muted, fontSize:11, padding:20 }}>Loading history…</div>;
  if (!workouts.length && !prs.length)
    return <div style={{ color:UI.muted, fontSize:11, padding:20, lineHeight:1.6 }}>
      No logged strength workouts yet. Log one in the <b style={{color:UI.accent}}>LOG</b> tab — it'll appear here and in your dashboard calendar.</div>;

  const card = { background:UI.card, border:`1px solid ${UI.line}`, borderRadius:8, padding:"12px 14px", marginBottom:12 };
  return (
    <div>
      {vol.length > 1 && (
        <div style={card}>
          <div style={{ fontSize:9, letterSpacing:2, color:UI.cyan, marginBottom:8 }}>DAILY VOLUME (kg)</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={vol} margin={{ top:4, right:8, bottom:0, left:-12 }}>
              <XAxis dataKey="date" tick={{ fontSize:8, fill:UI.muted }} />
              <YAxis tick={{ fontSize:8, fill:UI.muted }} />
              <Tooltip contentStyle={{ background:UI.panel, border:`1px solid ${UI.border}`, fontSize:11 }} />
              <Line type="monotone" dataKey="vol" stroke={UI.accent} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize:9, letterSpacing:2, color:UI.warn, marginBottom:8 }}>PERSONAL RECORDS · e1RM</div>
        {prs.slice(0,15).map((p)=>(
          <div key={p.exercise_id} style={{ display:"flex", justifyContent:"space-between", fontSize:11,
            padding:"5px 0", borderBottom:`1px solid ${UI.line}` }}>
            <span style={{ color:UI.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginRight:8 }}>{p.exercise_name}</span>
            <span style={{ color:UI.muted, flexShrink:0 }}>
              <b style={{ color:UI.warn }}>{round1(p.best_e1rm_kg)}kg</b> e1RM · {round1(p.heaviest_kg)}kg top
            </span>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontSize:9, letterSpacing:2, color:UI.accent, marginBottom:8 }}>RECENT WORKOUTS</div>
        {workouts.map((w)=>(
          <div key={w.id} style={{ display:"flex", justifyContent:"space-between", fontSize:11,
            padding:"5px 0", borderBottom:`1px solid ${UI.line}` }}>
            <span style={{ color:UI.text }}>{w.workout_date} · {w.label}</span>
            <span style={{ color:UI.muted }}>{w.session_type}{w.srpe ? " · sRPE "+w.srpe : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────────
export default function StrengthLogger() {
  const [tab, setTab] = useState("log");          // log | history
  const [catalog, setCatalog] = useState(null);   // exercise library (lazy)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(null);

  // current workout draft
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState("Lower Strength");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [srpe, setSrpe] = useState("");
  const [blocks, setBlocks] = useState([]);       // [{ex, sets:[...]}]
  const startRef = useRef(new Date());

  const loadCatalog = async () => {
    if (catalog) return;
    const { data } = await supabase.from("exercises")
      .select("id,name,equipment,category,primary_muscles,secondary_muscles,instructions,images")
      .order("name");
    setCatalog(data || []);
  };
  useEffect(() => { loadCatalog(); }, []);

  const openPicker = async () => { await loadCatalog(); setPickerOpen(true); };
  const addExercise = (ex) => {
    setBlocks((b) => [...b, { ex, sets: [{ weight:"", reps:"", rpe:"", warmup:false, done:false }] }]);
    setPickerOpen(false);
  };
  const setBlockSets = (i, sets) => setBlocks((b) => b.map((x, j) => (j === i ? { ...x, sets } : x)));
  const removeBlock = (i) => setBlocks((b) => b.filter((_, j) => j !== i));

  // live totals
  const totalVol = blocks.reduce((a, blk) =>
    a + blk.sets.reduce((x, s) => x + (s.warmup ? 0 : (parseFloat(s.weight)||0) * (parseInt(s.reps)||0)), 0), 0);
  const totalSets = blocks.reduce((a, blk) => a + blk.sets.filter(s => !s.warmup && s.weight && s.reps).length, 0);

  const reset = () => {
    setBlocks([]); setLabel(""); setNotes(""); setSrpe(""); setType("Lower Strength");
    setDate(todayISO()); startRef.current = new Date();
  };

  const finish = async () => {
    if (!blocks.length) { setSavedMsg({ ok:false, t:"Add at least one exercise first." }); return; }
    const working = blocks.flatMap((blk, bi) =>
      blk.sets.filter(s => s.weight && s.reps).map((s, si) => ({
        exercise_id: blk.ex.id,
        exercise_name: blk.ex.name,
        set_index: si + 1,
        weight_kg: parseFloat(s.weight),
        reps: parseInt(s.reps),
        rpe: s.rpe ? parseFloat(s.rpe) : null,
        is_warmup: !!s.warmup,
        _bi: bi,
      })));
    if (!working.length) { setSavedMsg({ ok:false, t:"No completed sets to save (need weight + reps)." }); return; }

    setSaving(true); setSavedMsg(null);
    try {
      const { data: w, error: we } = await supabase.from("strength_workouts").insert({
        workout_date: date,
        session_type: type,
        label: label.trim() || `${type} · ${date}`,
        notes: notes.trim() || null,
        srpe: srpe ? parseInt(srpe) : null,
        status: "in_progress",
        started_at: startRef.current.toISOString(),
      }).select().single();
      if (we) throw we;

      const rows = working.map(({ _bi, ...r }) => ({ ...r, workout_id: w.id }));
      const { error: se } = await supabase.from("strength_sets").insert(rows);
      if (se) throw se;

      // flip to completed → trigger rolls up into `sessions`
      const { error: ue } = await supabase.from("strength_workouts")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", w.id);
      if (ue) throw ue;

      setSavedMsg({ ok:true, t:`Saved · ${rows.length} sets · ${Math.round(totalVol).toLocaleString()}kg volume. Now in your dashboard calendar.` });
      reset();
    } catch (err) {
      setSavedMsg({ ok:false, t:"Save failed: " + (err.message || err) });
    } finally {
      setSaving(false);
    }
  };

  const typeColor = (SESSION_TYPES.find(t => t.key === type) || {}).color || UI.accent;
  const subBtn = (active) => ({
    flex:1, background: active ? "#4a4a68" : "transparent",
    border:`1px solid ${active ? UI.cyan : UI.border}`, color: active ? UI.cyan : UI.muted,
    borderRadius:6, padding:"8px 4px", fontSize:9, letterSpacing:1, cursor:"pointer", fontFamily:mono,
  });
  const fieldStyle = { background:UI.field, border:`1px solid ${UI.border}`, borderRadius:6,
    padding:"9px 10px", color:UI.text, fontSize:13, fontFamily:mono, boxSizing:"border-box" };

  return (
    <div style={{ fontFamily:mono }}>
      <div style={{ display:"flex", gap:6, marginBottom:14 }}>
        <button style={subBtn(tab==="log")} onClick={()=>setTab("log")}>LOG</button>
        <button style={subBtn(tab==="history")} onClick={()=>setTab("history")}>HISTORY · PRs</button>
      </div>

      {tab === "history" && <History />}

      {tab === "log" && (
        <>
          {/* workout header */}
          <div style={{ background:UI.panel, border:`1px solid ${UI.border}`, borderLeft:`3px solid ${typeColor}`,
            borderRadius:8, padding:"12px 14px", marginBottom:12 }}>
            <input value={label} onChange={(e)=>setLabel(e.target.value)} placeholder="Workout name (optional)"
              style={{ ...fieldStyle, width:"100%", marginBottom:8 }} />
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
              <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={{ ...fieldStyle, flex:"1 1 130px" }} />
              <select value={type} onChange={(e)=>setType(e.target.value)} style={{ ...fieldStyle, flex:"1 1 130px" }}>
                {SESSION_TYPES.map(t => <option key={t.key} value={t.key}>{t.key}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:9, color:UI.dim, letterSpacing:1 }}>sRPE</span>
              <input value={srpe} inputMode="numeric" onChange={(e)=>setSrpe(e.target.value)} placeholder="1–10"
                style={{ ...fieldStyle, width:70 }} />
              <span style={{ fontSize:9, color:UI.dim }}>talk-test anchored (full convo = 3)</span>
            </div>
          </div>

          {blocks.map((blk, i) => (
            <ExerciseBlock key={i} ex={blk.ex} sets={blk.sets}
              onSets={(s)=>setBlockSets(i, s)} onRemove={()=>removeBlock(i)} />
          ))}

          <button onClick={openPicker} style={{ width:"100%", background:UI.accent, color:UI.bg, border:"none",
            borderRadius:8, padding:"12px", fontSize:12, fontWeight:700, letterSpacing:1, cursor:"pointer",
            fontFamily:mono, marginBottom:12 }}>＋ ADD EXERCISE</button>

          <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Session notes…"
            rows={2} style={{ ...fieldStyle, width:"100%", marginBottom:12, resize:"vertical" }} />

          {savedMsg && (
            <div style={{ fontSize:11, lineHeight:1.5, marginBottom:12, padding:"10px 12px", borderRadius:6,
              color: savedMsg.ok ? UI.accent : UI.err,
              background: savedMsg.ok ? "#34d39915" : "#ff2d5515",
              border:`1px solid ${savedMsg.ok ? UI.accent : UI.err}40` }}>{savedMsg.t}</div>
          )}

          {/* sticky-ish footer */}
          <div style={{ position:"sticky", bottom:0, background:`${UI.bg}f2`, borderTop:`1px solid ${UI.line}`,
            padding:"10px 0", display:"flex", gap:10, alignItems:"center", backdropFilter:"blur(6px)" }}>
            <div style={{ flex:1, fontSize:10, color:UI.muted }}>
              <b style={{ color:UI.accent }}>{Math.round(totalVol).toLocaleString()}kg</b> vol · <b style={{ color:UI.text }}>{totalSets}</b> sets
            </div>
            <button onClick={finish} disabled={saving} style={{ background: saving ? UI.border : typeColor,
              color:UI.bg, border:"none", borderRadius:8, padding:"11px 20px", fontSize:12, fontWeight:700,
              letterSpacing:1, cursor: saving ? "default" : "pointer", fontFamily:mono }}>
              {saving ? "SAVING…" : "FINISH WORKOUT"}
            </button>
          </div>
        </>
      )}

      {pickerOpen && catalog && (
        <ExercisePicker catalog={catalog} onPick={addExercise} onClose={()=>setPickerOpen(false)} />
      )}
    </div>
  );
}
