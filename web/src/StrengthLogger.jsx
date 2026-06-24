/* ═══════════════════════════════════════════════════════════════
   STRENGTH LOGGER · v2 — ported from the standalone prototype.
   ───────────────────────────────────────────────────────────────
   Coach-assigned workouts, templates (per-set plans), last-performance
   reference, live set logging + rest timer, exercise picker over the
   873-row library, muscle-heatmap + animated movement demo, history/PRs.
   Mounted as a scoped React component inside the dashboard's Logger tab:
   reuses the dashboard's shared Supabase auth/session, palette mapped to
   the dashboard theme, the prototype's own login/header dropped.
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useRef } from 'react';
import { supabase as sb } from './supabaseClient.js';

const CSS = `
.slog{ --bg:#08080d; --panel:#2a2a48; --panel2:#1e1e30; --line:#4a4a68;
  --txt:#e8e8f0; --mut:#7e7e9a; --accent:#00d4ff; --accent2:#00a8cc;
  --good:#34d399; --warn:#ffd700; --bad:#ff2d55; --coach:#a78bfa; --radius:12px;
  color:var(--txt); font-family:'DM Mono','Courier New',monospace; display:block; }
.slog *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.slog h1,.slog h2,.slog h3{margin:0;font-weight:700}
.slog button{font-family:inherit;cursor:pointer;border:none;font-size:15px}
.slog input,.slog select{font-family:inherit;font-size:16px}
.slog .hidden{display:none!important}
.slog .mut{color:var(--mut)}
.slog .row{display:flex;align-items:center;gap:10px}
.slog .sp{justify-content:space-between}
.slog .wrap{padding:2px 0 16px}
.slog .pill{font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.5px}
.slog .pill.coach{background:rgba(167,139,250,.16);color:#c79bf2}
.slog .pill.custom{background:rgba(0,212,255,.16);color:#7ad7ff}
.slog .pill.template{background:rgba(52,211,153,.16);color:#6fe09a}
.slog .card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:16px;margin-bottom:14px}
.slog .card.tap{cursor:pointer;transition:transform .08s,border-color .15s}
.slog .card.tap:active{transform:scale(.99)}
.slog .card.coach{border-color:rgba(167,139,250,.35);background:linear-gradient(180deg,rgba(167,139,250,.07),transparent 60%),var(--panel)}
.slog .section-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--mut);margin:22px 4px 10px}
.slog .btn{background:var(--accent);color:#04222b;border-radius:12px;padding:13px 16px;font-weight:700;width:100%;text-align:center}
.slog .btn:active{background:var(--accent2)}
.slog .btn.sec{background:var(--panel2);color:var(--txt);border:1px solid var(--line)}
.slog .btn.ghost{background:transparent;color:var(--accent);padding:10px}
.slog .btn.danger{background:rgba(255,45,85,.14);color:#ff9b9b}
.slog .btn.good{background:var(--good);color:#06210f}
.slog .btn.sm{width:auto;padding:9px 13px;font-size:14px;border-radius:10px}
.slog .btn.xs{width:auto;padding:6px 10px;font-size:13px;border-radius:9px}
.slog .ex-block{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);margin-bottom:14px;overflow:hidden}
.slog .ex-head{padding:13px 14px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;border-bottom:1px solid var(--line)}
.slog .ex-name{font-weight:700;font-size:16px}
.slog .ex-target{font-size:12.5px;color:var(--mut);margin-top:3px}
.slog .set-grid{display:grid;grid-template-columns:26px 1fr 1fr 52px 34px 24px;gap:7px;align-items:center;padding:8px 12px}
.slog .set-grid.hd{padding-top:10px;padding-bottom:4px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--mut)}
.slog .set-grid input{width:100%;background:var(--panel2);border:1px solid var(--line);color:var(--txt);border-radius:9px;padding:9px 6px;text-align:center;font-weight:600}
.slog .set-grid input:focus{outline:none;border-color:var(--accent)}
.slog .setno{display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--mut);position:relative}
.slog .setno.warm{color:var(--warn)}
.slog .chk{width:30px;height:30px;border-radius:8px;border:1.5px solid var(--line);background:var(--panel2);display:flex;align-items:center;justify-content:center;font-size:16px;color:transparent}
.slog .chk.on{background:var(--good);border-color:var(--good);color:#06210f}
.slog .set-row.done input{opacity:.55}
.slog .set-row.sug input{border-color:rgba(167,139,250,.4)}
.slog .set-row.sug input::placeholder{color:rgba(167,139,250,.55)}
.slog .ex-foot{display:flex;gap:8px;padding:6px 12px 12px;flex-wrap:wrap;align-items:center}
.slog .e1rm{font-size:11px;color:var(--mut);text-align:center;padding:0 12px 8px}
.slog .set-del{background:none;color:var(--mut);font-size:15px;padding:0;line-height:1;border-radius:8px}
.slog .set-del:active{color:var(--bad)}
.slog .rest-edit{display:flex;align-items:center;gap:7px;margin-left:auto;background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:4px 6px}
.slog .rest-edit .lbl{font-size:12px;color:var(--mut);font-weight:600;padding-left:3px}
.slog .rest-edit .step{width:28px;height:28px;border-radius:8px;background:var(--bg);color:var(--txt);border:1px solid var(--line);font-size:16px;font-weight:700;line-height:1}
.slog .rest-edit .step:active{border-color:var(--accent)}
.slog .rest-val{font-size:13px;font-weight:700;min-width:38px;text-align:center;font-variant-numeric:tabular-nums}
.slog nav{display:flex;gap:6px;margin-bottom:14px}
.slog nav button{flex:1;background:var(--panel2);color:var(--mut);display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:700;padding:10px;border-radius:10px;border:1px solid var(--line)}
.slog nav button.active{color:var(--accent);border-color:var(--accent)}
.slog nav svg{width:18px;height:18px}
.slog #restBar{position:fixed;left:0;right:0;bottom:0;z-index:40;max-width:680px;margin:0 auto;background:var(--accent2);color:#04222b;padding:14px 18px;display:flex;justify-content:space-between;align-items:center}
.slog #restBar .t{font-size:26px;font-weight:800;font-variant-numeric:tabular-nums}
.slog .sheet-bg{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:50;display:flex;align-items:flex-end;justify-content:center}
.slog .sheet{background:var(--panel);width:100%;max-width:680px;max-height:88vh;border-radius:18px 18px 0 0;border-top:1px solid var(--line);display:flex;flex-direction:column;animation:slogup .22s ease}
@keyframes slogup{from{transform:translateY(40px);opacity:.6}to{transform:translateY(0);opacity:1}}
.slog .sheet-hd{padding:14px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}
.slog .sheet-body{overflow-y:auto;padding:12px 14px}
.slog .search{width:100%;background:var(--panel2);border:1px solid var(--line);color:var(--txt);border-radius:11px;padding:12px 14px;margin-bottom:10px}
.slog .chips{display:flex;gap:7px;overflow-x:auto;padding-bottom:8px;margin-bottom:6px}
.slog .chip{white-space:nowrap;background:var(--panel2);border:1px solid var(--line);color:var(--mut);padding:7px 12px;border-radius:999px;font-size:13px;font-weight:600}
.slog .chip.on{background:var(--accent);border-color:var(--accent);color:#04222b}
.slog .ex-item{padding:12px 8px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:10px}
.slog .ex-item .nm{font-weight:600}
.slog .ex-item .meta{font-size:12px;color:var(--mut);text-transform:capitalize}
.slog .empty{text-align:center;color:var(--mut);padding:30px 10px;font-size:14px}
.slog #toast{position:fixed;bottom:96px;left:50%;transform:translateX(-50%);background:#000;color:#fff;padding:11px 18px;border-radius:11px;z-index:80;font-size:14px;font-weight:600;opacity:0;transition:opacity .2s;max-width:90%}
.slog #toast.show{opacity:.95}
.slog .spin{width:20px;height:20px;border:2.5px solid var(--line);border-top-color:var(--accent);border-radius:50%;animation:slogr .7s linear infinite;display:inline-block}
@keyframes slogr{to{transform:rotate(360deg)}}
.slog .demo-btn{flex:0 0 auto;background:var(--panel2);color:var(--mut);border:1px solid var(--line);border-radius:9px;padding:6px 10px;font-size:13px;font-weight:600}
.slog .demo-btn:active{border-color:var(--accent)}
.slog .demo-wrap{padding-bottom:20px}
.slog .demo-map{background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:12px}
.slog .demo-map svg{display:block;width:100%;height:auto;max-height:320px}
.slog .demo-legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--mut);margin-top:10px;justify-content:center}
.slog .demo-legend i{width:12px;height:12px;border-radius:3px;display:inline-block;margin-right:5px;vertical-align:-1px}
.slog .demo-muscles{font-size:13px;color:var(--mut);margin-top:12px}
.slog .demo-muscles b{color:var(--txt)}
.slog .demo-tag{display:inline-block;background:var(--panel2);border:1px solid var(--line);border-radius:7px;padding:2px 8px;margin:2px 3px;font-size:12px;text-transform:capitalize}
.slog .demo-viewer{margin-top:16px}
.slog .demo-video{width:100%;border-radius:12px;background:#000;display:block;max-height:360px;object-fit:contain}
.slog .demo-cap{font-size:12px;color:var(--mut);text-align:center;margin-top:9px}
.slog .demo-controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px}
.slog .demo-controls .lbl{font-size:12px;color:var(--mut);font-weight:600}
.slog .seg{display:flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.slog .seg button{background:var(--panel2);color:var(--mut);padding:8px 13px;font-size:13px;font-weight:700}
.slog .seg button.on{background:var(--accent);color:#04222b}
.slog .demo-fallback{margin-top:4px;padding:20px 16px;border:1px dashed var(--line);border-radius:12px;text-align:center;color:var(--mut);font-size:13.5px;line-height:1.5}
`;

const SKELETON = `
  <nav>
    <button data-tab="home" class="active" id="navHome">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 6.5h2v11h-2zM15.5 6.5h2v11h-2zM8.5 11h7v2h-7zM3.5 9h2v6h-2zM18.5 9h2v6h-2z"/></svg>Strength</button>
    <button data-tab="history" id="navHist">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v5l3 2M21 12a9 9 0 1 1-9-9"/><path d="M3 5v4h4"/></svg>History</button>
  </nav>
  <div id="homeView" class="wrap"></div>
  <div id="workoutView" class="wrap hidden"></div>
  <div id="historyView" class="wrap hidden"></div>
  <div id="restBar" class="hidden">
    <div><div style="font-size:12px;opacity:.85;font-weight:600">REST</div><div class="t" id="restT">0:00</div></div>
    <div class="row">
      <button class="btn xs sec" style="background:rgba(255,255,255,.18);color:#fff" id="restMinus">−30s</button>
      <button class="btn xs sec" style="background:rgba(255,255,255,.18);color:#fff" id="rest30">+30s</button>
      <button class="btn xs" style="background:#fff;color:var(--accent2)" id="restSkip">Skip</button>
    </div>
  </div>
  <div id="toast" class="toast"></div>
  <div id="sheet"></div>
`;

function mountStrengthLogger(root) {
  /* ---------- helpers ---------- */
  const $ = (s) => root.querySelector(s);
  const el = (t, c, h) => {
    const e = document.createElement(t);
    if (c) e.className = c;
    if (h != null) e.innerHTML = h;
    return e;
  };
  const esc = (s) =>
    (s == null ? '' : String(s)).replace(
      /[&<>"]/g,
      (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]
    );
  const todayISO = () => new Date().toLocaleDateString('en-CA');
  function toast(m) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = m;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2200);
  }
  function e1rm(w, r) {
    if (!w || !r) return null;
    return Math.round(w * (1 + r / 30));
  }
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

  /* ---------- state ---------- */
  let USER = null;
  let active = null;
  let restTimer = null,
    restRemain = 0,
    restEi = null;
  let EXPREF = null;

  /* ---------- per-exercise preferences (remembered rest time) ---------- */
  async function loadPrefs() {
    if (EXPREF) return EXPREF;
    EXPREF = {};
    const { data } = await sb
      .from('exercise_prefs')
      .select('exercise_id,rest_seconds');
    (data || []).forEach((r) => {
      if (r.rest_seconds != null) EXPREF[r.exercise_id] = r.rest_seconds;
    });
    return EXPREF;
  }
  function restPref(id, fallback) {
    return EXPREF && id && EXPREF[id] != null ? EXPREF[id] : fallback;
  }
  function saveRestPref(id, sec) {
    if (!id || !USER) return;
    if (!EXPREF) EXPREF = {};
    EXPREF[id] = sec;
    sb.from('exercise_prefs')
      .upsert(
        {
          user_id: USER.id,
          exercise_id: id,
          rest_seconds: sec,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,exercise_id' }
      )
      .then(({ error }) => {
        if (error) console.warn('pref save', error.message);
      });
  }

  /* ---------- nav ---------- */
  root
    .querySelectorAll('nav button')
    .forEach((b) => (b.onclick = () => show(b.dataset.tab)));
  function setNav(tab) {
    root
      .querySelectorAll('nav button')
      .forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  }
  function show(view) {
    $('#homeView').classList.toggle('hidden', view !== 'home');
    $('#historyView').classList.toggle('hidden', view !== 'history');
    $('#workoutView').classList.toggle('hidden', view !== 'workout');
    if (view === 'home') {
      setNav('home');
      loadHome();
    }
    if (view === 'history') {
      setNav('history');
      loadHistory();
    }
  }

  /* ---------- HOME ---------- */
  async function loadHome() {
    const v = $('#homeView');
    v.innerHTML = '<div class="empty"><span class="spin"></span></div>';
    loadPrefs();
    const { data: assigns } = await sb
      .from('workout_assignments')
      .select('*, templates(*)')
      .in('status', ['pending', 'in_progress'])
      .lte('assigned_date', todayISO())
      .order('assigned_date', { ascending: true });
    const { data: tpls } = await sb
      .from('templates')
      .select('*')
      .eq('is_archived', false)
      .order('origin', { ascending: true })
      .order('name', { ascending: true });
    v.innerHTML = '';
    if (active) {
      const c = el('div', 'card coach');
      c.innerHTML = `<div class="row sp"><div><div style="font-weight:700">Workout in progress</div>
        <div class="mut" style="font-size:13px">${esc(active.label)}</div></div></div>`;
      const b = el('button', 'btn good', 'Resume');
      b.style.marginTop = '10px';
      b.onclick = () => show('workout');
      c.appendChild(b);
      v.appendChild(c);
    }
    const addCard = el('div', 'card');
    addCard.innerHTML =
      '<div style="font-weight:800;font-size:17px;margin-bottom:3px">Strength training</div>' +
      '<div class="mut" style="font-size:13.5px;margin-bottom:13px">Log a new session — start fresh, or pick a coach-pushed or saved workout below.</div>';
    const addBtn = el('button', 'btn', '+ Add a session');
    addBtn.onclick = startCustom;
    addCard.appendChild(addBtn);
    v.appendChild(addCard);
    v.appendChild(el('div', 'section-title', 'Pushed by coach'));
    if (assigns && assigns.length) {
      assigns.forEach((a) => {
        const t = a.templates || {};
        const c = el('div', 'card coach tap');
        c.innerHTML = `<div class="row sp"><h3>${esc(t.name || 'Workout')}</h3><span class="pill coach">coach</span></div>
          <div class="ex-target" style="margin-top:6px">${esc(t.session_type || '')} · assigned ${esc(a.assigned_date)}</div>
          ${a.coach_note ? `<div class="card" style="margin:12px 0 0;background:var(--panel2);font-size:13.5px">📝 ${esc(a.coach_note)}</div>` : ''}`;
        const b = el('button', 'btn', 'Start workout');
        b.style.marginTop = '12px';
        b.onclick = (e) => {
          e.stopPropagation();
          startFromTemplate(t, { origin: 'coach', assignment: a });
        };
        c.appendChild(b);
        v.appendChild(c);
      });
    } else {
      v.appendChild(
        el(
          'div',
          'empty',
          'No coach-prescribed workouts due. Nice — pick a template or go custom.'
        )
      );
    }
    v.appendChild(el('div', 'section-title', 'Templates'));
    const lib = tpls || [];
    if (lib.length) {
      lib.forEach((t) => {
        const c = el('div', 'card tap');
        c.innerHTML = `<div class="row sp"><h3>${esc(t.name)}</h3><span class="pill ${t.origin === 'coach' ? 'coach' : 'template'}">${esc(t.origin)}</span></div>
          <div class="ex-target" style="margin-top:6px">${esc(t.session_type || '')}${t.description ? ' · ' + esc(t.description) : ''}</div>`;
        c.onclick = () => startFromTemplate(t, { origin: 'template' });
        v.appendChild(c);
      });
    } else {
      v.appendChild(el('div', 'empty', 'No templates yet.'));
    }
  }

  /* ---------- START WORKOUTS ---------- */
  async function startFromTemplate(tpl, opts) {
    opts = opts || {};
    await loadPrefs();
    const { data: tex } = await sb
      .from('template_exercises')
      .select('*')
      .eq('template_id', tpl.id)
      .order('position');
    const list = tex || [];
    const lastPerf = await fetchLastPerf(
      list.map((te) => te.exercise_id).filter(Boolean)
    );
    const exercises = list.map((te) => {
      let plan =
        Array.isArray(te.set_plan) && te.set_plan.length
          ? te.set_plan
          : Array.from({ length: te.target_sets || 3 }).map(() => ({
              weight_kg: te.target_weight_kg,
              reps: te.target_reps,
              rpe: te.target_rpe,
              type: 'work',
            }));
      return {
        exercise_id: te.exercise_id,
        exercise_name: te.exercise_name,
        target_reps: te.target_reps,
        target_rpe: te.target_rpe,
        target_sets: te.target_sets,
        rest_seconds: restPref(te.exercise_id, te.rest_seconds || 120),
        notes: te.notes,
        last: lastPerf[te.exercise_id] || null,
        sets: plan.map((p) => ({
          weight: p.weight_kg != null ? String(p.weight_kg) : '',
          reps: p.reps != null ? String(p.reps) : '',
          rpe: p.rpe != null ? String(p.rpe) : '',
          warmup: p.type === 'warmup',
          done: false,
          sug: { weight: p.weight_kg, reps: p.reps, rpe: p.rpe },
        })),
      };
    });
    beginWorkout({
      label: tpl.name,
      session_type: tpl.session_type || 'Strength',
      origin: opts.origin || 'template',
      template_id: tpl.id,
      assignment: opts.assignment || null,
      exercises,
    });
  }
  async function fetchLastPerf(ids) {
    const out = {};
    if (!ids || !ids.length) return out;
    const { data } = await sb
      .from('exercise_last_performance')
      .select('*')
      .in('exercise_id', ids);
    (data || []).forEach((r) => {
      (out[r.exercise_id] = out[r.exercise_id] || {
        date: r.workout_date,
        sets: [],
      }).sets.push({
        i: r.set_index,
        w: r.weight_kg,
        reps: r.reps,
        rpe: r.rpe,
        e1rm: r.e1rm_kg,
      });
    });
    Object.values(out).forEach((o) => o.sets.sort((a, b) => a.i - b.i));
    return out;
  }
  function startCustom() {
    beginWorkout({
      label: 'Custom workout',
      session_type: 'Strength',
      origin: 'custom',
      template_id: null,
      assignment: null,
      exercises: [],
    });
  }
  async function beginWorkout(w) {
    const ins = {
      label: w.label,
      session_type: w.session_type,
      status: 'in_progress',
      origin: w.origin,
      template_id: w.template_id,
      assignment_id: w.assignment ? w.assignment.id : null,
      started_at: new Date().toISOString(),
    };
    const { data, error } = await sb
      .from('strength_workouts')
      .insert(ins)
      .select()
      .single();
    if (error) {
      toast('Could not start: ' + error.message);
      return;
    }
    w.id = data.id;
    w.started = Date.now();
    if (w.assignment) {
      sb.from('workout_assignments')
        .update({ status: 'in_progress', workout_id: w.id })
        .eq('id', w.assignment.id)
        .then(() => {});
    }
    active = w;
    renderWorkout();
    show('workout');
  }

  /* ---------- ACTIVE WORKOUT RENDER ---------- */
  function renderWorkout() {
    const v = $('#workoutView');
    v.innerHTML = '';
    const top = el('div', 'card');
    top.innerHTML = `<div class="row sp">
        <div><h2>${esc(active.label)}</h2><div class="mut" id="elapsed" style="font-size:13px"></div></div>
        <span class="pill ${active.origin === 'coach' ? 'coach' : active.origin === 'custom' ? 'custom' : 'template'}">${esc(active.origin)}</span>
      </div>`;
    v.appendChild(top);
    active.exercises.forEach((ex, ei) => v.appendChild(renderExercise(ex, ei)));
    const add = el('button', 'btn sec', '+ Add exercise');
    add.style.marginBottom = '14px';
    add.onclick = () => openPicker();
    v.appendChild(add);
    const fin = el('button', 'btn good', 'Finish & save workout');
    fin.onclick = () => finishWorkout(fin);
    v.appendChild(fin);
    const cancel = el('button', 'btn danger', 'Discard workout');
    cancel.style.marginTop = '10px';
    cancel.onclick = discardWorkout;
    v.appendChild(cancel);
    tickElapsed();
  }
  function renderExercise(ex, ei) {
    const b = el('div', 'ex-block');
    const sug = ex.sets.filter((s) => s.sug && !s.warmup);
    const topW = Math.max(0, ...sug.map((s) => parseFloat(s.sug.weight) || 0));
    const tgt = [];
    if (ex.target_sets && ex.target_reps)
      tgt.push(`${ex.target_sets}×${ex.target_reps}`);
    if (ex.target_rpe) tgt.push(`@RPE ${ex.target_rpe}`);
    if (topW > 0) tgt.push(`top ${topW}kg`);
    if (ex.rest_seconds) tgt.push(`${ex.rest_seconds}s rest`);
    const lastStr = ex.last ? lastLine(ex.last) : '';
    b.appendChild(
      el(
        'div',
        'ex-head',
        `<div><div class="ex-name">${esc(ex.exercise_name)}</div>
        ${tgt.length ? `<div class="ex-target" style="color:var(--coach)">🎯 Coach: ${tgt.join(' · ')}</div>` : ''}
        ${lastStr ? `<div class="ex-target">↩ ${esc(lastStr)}</div>` : ''}
        ${ex.notes ? `<div class="ex-target" style="color:var(--coach)">📝 ${esc(ex.notes)}</div>` : ''}</div>`
      )
    );
    const rmv = b.querySelector('.ex-head');
    if (ex.exercise_id) {
      const db = el('button', 'demo-btn', '◐ Demo');
      db.title = 'Movement & muscles worked';
      db.onclick = () => openExerciseDemo(ex.exercise_id, ex.exercise_name);
      rmv.appendChild(db);
    }
    const rb = el('button', 'btn xs sec', '✕');
    rb.style.flex = '0 0 auto';
    rb.onclick = () => {
      active.exercises.splice(ei, 1);
      renderWorkout();
    };
    rmv.appendChild(rb);
    const hd = el('div', 'set-grid hd');
    hd.innerHTML =
      '<div>Set</div><div>Kg</div><div>Reps</div><div>RPE</div><div></div><div></div>';
    b.appendChild(hd);
    ex.sets.forEach((s, si) => b.appendChild(renderSet(ex, ei, s, si)));
    const er = el('div', 'e1rm');
    er.id = `e1-${ei}`;
    er.innerHTML = bestE1(ex);
    b.appendChild(er);
    const foot = el('div', 'ex-foot');
    const addSet = el('button', 'btn xs sec', '+ Set');
    addSet.onclick = () => {
      const last = ex.sets[ex.sets.length - 1] || {};
      ex.sets.push({
        weight: last.weight || '',
        reps: '',
        rpe: '',
        warmup: false,
        done: false,
      });
      renderWorkout();
    };
    const warm = el('button', 'btn xs sec', '+ Warmup');
    warm.onclick = () => {
      ex.sets.unshift({
        weight: '',
        reps: '',
        rpe: '',
        warmup: true,
        done: false,
      });
      renderWorkout();
    };
    foot.appendChild(addSet);
    foot.appendChild(warm);
    const restEdit = el('div', 'rest-edit');
    restEdit.appendChild(el('span', 'lbl', 'Rest'));
    const dn = el('button', 'step', '−');
    const rv = el('span', 'rest-val');
    rv.id = `rv-${ei}`;
    rv.textContent = (ex.rest_seconds || 0) + 's';
    const up = el('button', 'step', '+');
    const bump = (d) => {
      ex.rest_seconds = Math.max(0, (ex.rest_seconds || 0) + d);
      rv.textContent = ex.rest_seconds + 's';
      saveRestPref(ex.exercise_id, ex.rest_seconds);
    };
    dn.onclick = () => bump(-15);
    up.onclick = () => bump(15);
    restEdit.appendChild(dn);
    restEdit.appendChild(rv);
    restEdit.appendChild(up);
    foot.appendChild(restEdit);
    b.appendChild(foot);
    return b;
  }
  function renderSet(ex, ei, s, si) {
    const r = el(
      'div',
      'set-grid set-row' +
        (s.done ? ' done' : '') +
        (s.sug && !s.done ? ' sug' : '')
    );
    const no = el(
      'div',
      'setno' + (s.warmup ? ' warm' : ''),
      s.warmup ? 'W' : String(workingIndex(ex, si))
    );
    const ph = (k) => (s.sug && s.sug[k] != null ? String(s.sug[k]) : '–');
    const w = el('input');
    w.type = 'number';
    w.inputMode = 'decimal';
    w.placeholder = ph('weight');
    w.value = s.weight;
    const rp = el('input');
    rp.type = 'number';
    rp.inputMode = 'numeric';
    rp.placeholder = ph('reps');
    rp.value = s.reps;
    const rpe = el('input');
    rpe.type = 'number';
    rpe.inputMode = 'decimal';
    rpe.placeholder = ph('rpe');
    rpe.value = s.rpe;
    rpe.step = '0.5';
    w.oninput = () => {
      s.weight = w.value;
      upd(ei);
    };
    rp.oninput = () => {
      s.reps = rp.value;
      upd(ei);
    };
    rpe.oninput = () => {
      s.rpe = rpe.value;
    };
    const chk = el('div', 'chk' + (s.done ? ' on' : ''), '✓');
    chk.onclick = () => {
      s.done = !s.done;
      r.classList.toggle('done', s.done);
      chk.classList.toggle('on', s.done);
      if (s.done) {
        startRest(ex.rest_seconds || 120, ei);
        if (navigator.vibrate) navigator.vibrate(15);
      }
    };
    const del = el('button', 'set-del', '✕');
    del.title = 'Remove set';
    del.onclick = () => {
      ex.sets.splice(si, 1);
      renderWorkout();
    };
    r.appendChild(no);
    r.appendChild(w);
    r.appendChild(rp);
    r.appendChild(rpe);
    r.appendChild(chk);
    r.appendChild(del);
    return r;
  }
  function workingIndex(ex, si) {
    let n = 0;
    for (let i = 0; i <= si; i++) {
      if (!ex.sets[i].warmup) n++;
    }
    return n;
  }
  function upd(ei) {
    const e = $(`#e1-${ei}`);
    if (e) e.innerHTML = bestE1(active.exercises[ei]);
  }
  function bestE1(ex) {
    let best = 0;
    ex.sets.forEach((s) => {
      const v = e1rm(parseFloat(s.weight), parseInt(s.reps));
      if (v > best) best = v;
    });
    return best
      ? `Best est. 1RM this session: <b style="color:var(--txt)">${best} kg</b>`
      : 'Est. 1RM appears as you log';
  }
  function lastLine(last) {
    const d = last.date
      ? new Date(last.date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })
      : '';
    const sets = last.sets
      .slice(0, 4)
      .map(
        (x) =>
          `${x.w != null ? x.w : '–'}×${x.reps != null ? x.reps : '–'}${x.rpe != null ? '@' + x.rpe : ''}`
      )
      .join(', ');
    return `Last${d ? ' (' + d + ')' : ''}: ${sets}`;
  }
  let _tick = null;
  function tickElapsed() {
    const e = $('#elapsed');
    if (!e || !active) return;
    const sec = Math.floor((Date.now() - active.started) / 1000);
    const m = Math.floor(sec / 60);
    e.textContent = `${m}:${String(sec % 60).padStart(2, '0')} elapsed`;
    clearTimeout(_tick);
    _tick = setTimeout(tickElapsed, 1000);
  }

  /* ---------- rest timer ---------- */
  function startRest(sec, ei) {
    restRemain = sec;
    restEi = ei == null ? null : ei;
    $('#restBar').classList.remove('hidden');
    paintRest();
    clearInterval(restTimer);
    restTimer = setInterval(() => {
      restRemain--;
      paintRest();
      if (restRemain <= 0) {
        clearInterval(restTimer);
        $('#restBar').classList.add('hidden');
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      }
    }, 1000);
  }
  function paintRest() {
    const t = $('#restT');
    if (!t) return;
    const m = Math.floor(Math.max(restRemain, 0) / 60);
    t.textContent = `${m}:${String(Math.max(restRemain, 0) % 60).padStart(2, '0')}`;
  }
  function adjustRest(delta) {
    restRemain = Math.max(0, restRemain + delta);
    paintRest();
    if (restEi != null && active) {
      const ex = active.exercises[restEi];
      if (ex) {
        ex.rest_seconds = Math.max(0, (ex.rest_seconds || 0) + delta);
        const rv = $(`#rv-${restEi}`);
        if (rv) rv.textContent = ex.rest_seconds + 's';
        saveRestPref(ex.exercise_id, ex.rest_seconds);
      }
    }
  }
  $('#rest30').onclick = () => adjustRest(30);
  $('#restMinus').onclick = () => adjustRest(-30);
  $('#restSkip').onclick = () => {
    clearInterval(restTimer);
    $('#restBar').classList.add('hidden');
  };

  /* ---------- FINISH / DISCARD ---------- */
  async function finishWorkout(btn) {
    const rows = [];
    active.exercises.forEach((ex) => {
      ex.sets.forEach((s, i) => {
        const reps = parseInt(s.reps),
          wt = s.weight === '' ? null : parseFloat(s.weight);
        if (!s.done && !reps) return;
        rows.push({
          workout_id: active.id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          set_index: i + 1,
          weight_kg: wt,
          reps: isNaN(reps) ? null : reps,
          rpe: s.rpe === '' ? null : parseFloat(s.rpe),
          is_warmup: !!s.warmup,
          completed: !!s.done,
        });
      });
    });
    if (!rows.length) {
      toast('Log at least one set first');
      return;
    }
    const srpe = prompt(
      'Session RPE (1–10)?  How hard was the whole session?',
      '7'
    );
    if (btn) {
      btn.textContent = 'Saving…';
    }
    const { error: e1 } = await sb.from('strength_sets').insert(rows);
    if (e1) {
      toast('Save failed: ' + e1.message);
      if (btn) btn.textContent = 'Finish & save workout';
      return;
    }
    await sb
      .from('strength_workouts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        srpe: srpe ? parseInt(srpe) : null,
      })
      .eq('id', active.id);
    if (active.assignment) {
      await sb
        .from('workout_assignments')
        .update({ status: 'completed' })
        .eq('id', active.assignment.id);
    }
    toast('Workout saved 💪');
    active = null;
    show('home');
  }
  async function discardWorkout() {
    if (!confirm('Discard this workout? Nothing will be saved.')) return;
    await sb.from('strength_workouts').delete().eq('id', active.id);
    if (active.assignment) {
      await sb
        .from('workout_assignments')
        .update({ status: 'pending', workout_id: null })
        .eq('id', active.assignment.id);
    }
    active = null;
    toast('Discarded');
    show('home');
  }

  /* ---------- EXERCISE PICKER ---------- */
  let pickFilter = { q: '', muscle: '', equipment: '' };
  const MUSCLES = [
    'quadriceps',
    'hamstrings',
    'glutes',
    'calves',
    'chest',
    'back',
    'lats',
    'shoulders',
    'biceps',
    'triceps',
    'abdominals',
    'forearms',
  ];
  function openPicker() {
    pickFilter = { q: '', muscle: '', equipment: '' };
    const bg = el('div', 'sheet-bg');
    bg.onclick = (e) => {
      if (e.target === bg) closeSheet();
    };
    const sh = el('div', 'sheet');
    sh.innerHTML = `<div class="sheet-hd"><h3>Add exercise</h3><button class="btn xs sec" id="pkClose">Close</button></div>
      <div class="sheet-body">
        <input class="search" id="pkSearch" placeholder="Search 870+ exercises…" />
        <div class="chips" id="pkChips"></div>
        <div id="pkList"><div class="empty"><span class="spin"></span></div></div>
      </div>`;
    bg.appendChild(sh);
    $('#sheet').innerHTML = '';
    $('#sheet').appendChild(bg);
    $('#pkClose').onclick = closeSheet;
    const chips = $('#pkChips');
    ['All', ...MUSCLES].forEach((m) => {
      const c = el(
        'button',
        'chip' + (m === 'All' && !pickFilter.muscle ? ' on' : ''),
        cap(m)
      );
      c.onclick = () => {
        pickFilter.muscle = m === 'All' ? '' : m;
        [...chips.children].forEach((x) => x.classList.remove('on'));
        c.classList.add('on');
        runSearch();
      };
      chips.appendChild(c);
    });
    const si = $('#pkSearch');
    si.oninput = () => {
      pickFilter.q = si.value;
      clearTimeout(si._t);
      si._t = setTimeout(runSearch, 220);
    };
    si.focus();
    runSearch();
  }
  function closeSheet() {
    if (_demoTimer) {
      clearInterval(_demoTimer);
      _demoTimer = null;
    }
    const s = $('#sheet');
    if (s) s.innerHTML = '';
  }
  async function runSearch() {
    let q = sb
      .from('exercises')
      .select('id,name,equipment,primary_muscles,category')
      .limit(60)
      .order('name');
    if (pickFilter.q) q = q.ilike('name', '%' + pickFilter.q + '%');
    if (pickFilter.muscle)
      q = q.contains('primary_muscles', [pickFilter.muscle]);
    const { data, error } = await q;
    const list = $('#pkList');
    if (!list) return;
    if (error) {
      list.innerHTML = '<div class="empty">' + esc(error.message) + '</div>';
      return;
    }
    if (!data.length) {
      list.innerHTML = '<div class="empty">No matches.</div>';
      return;
    }
    list.innerHTML = '';
    data.forEach((x) => {
      const it = el('div', 'ex-item');
      it.innerHTML = `<div><div class="nm">${esc(x.name)}</div>
        <div class="meta">${esc(x.equipment || '—')} · ${esc((x.primary_muscles || []).join(', '))}</div></div>
        <button class="btn xs">Add</button>`;
      it.querySelector('button').onclick = () => addExercise(x);
      list.appendChild(it);
    });
  }
  function addExercise(x) {
    active.exercises.push({
      exercise_id: x.id,
      exercise_name: x.name,
      rest_seconds: restPref(x.id, 120),
      target_sets: null,
      target_reps: null,
      target_rpe: null,
      notes: null,
      sets: [
        { weight: '', reps: '', rpe: '', warmup: false, done: false },
        { weight: '', reps: '', rpe: '', warmup: false, done: false },
        { weight: '', reps: '', rpe: '', warmup: false, done: false },
      ],
    });
    closeSheet();
    renderWorkout();
    toast(x.name + ' added');
  }

  /* ---------- EXERCISE DEMO (heatmap + movement) ---------- */
  const REGIONS = new Set([
    'shoulders',
    'chest',
    'abdominals',
    'biceps',
    'triceps',
    'forearms',
    'lats',
    'back',
    'traps',
    'quadriceps',
    'hamstrings',
    'glutes',
    'calves',
  ]);
  function normalizeMuscle(name) {
    if (!name) return null;
    const k = String(name).trim().toLowerCase();
    const MAP = {
      abdominals: 'abdominals',
      abs: 'abdominals',
      biceps: 'biceps',
      triceps: 'triceps',
      forearms: 'forearms',
      chest: 'chest',
      pectorals: 'chest',
      shoulders: 'shoulders',
      deltoids: 'shoulders',
      delts: 'shoulders',
      lats: 'lats',
      'latissimus dorsi': 'lats',
      'middle back': 'back',
      'lower back': 'back',
      spine: 'back',
      'erector spinae': 'back',
      traps: 'traps',
      trapezius: 'traps',
      neck: 'traps',
      quadriceps: 'quadriceps',
      quads: 'quadriceps',
      adductors: 'quadriceps',
      hamstrings: 'hamstrings',
      glutes: 'glutes',
      abductors: 'glutes',
      calves: 'calves',
    };
    return MAP[k] || (REGIONS.has(k) ? k : null);
  }
  function applyHeatmap(rootEl, primary, secondary) {
    const prim = new Set((primary || []).map(normalizeMuscle).filter(Boolean));
    const sec = new Set((secondary || []).map(normalizeMuscle).filter(Boolean));
    rootEl.querySelectorAll('.muscle').forEach((n) => {
      const m = n.getAttribute('data-muscle');
      n.setAttribute(
        'fill',
        prim.has(m) ? '#ef4444' : sec.has(m) ? '#f59e0b' : '#46525f'
      );
    });
  }
  function heatmapSVG() {
    const M = (d, a) =>
      `<g>${a.map((s) => `<${s.t} class="muscle" data-muscle="${d}" fill="#46525f" ${s.a}/>`).join('')}</g>`;
    return `<svg viewBox="0 0 470 426" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Muscles worked">
      <text x="120" y="13" text-anchor="middle" fill="#8b97a7" font-size="12" font-family="sans-serif">FRONT</text>
      <text x="340" y="13" text-anchor="middle" fill="#8b97a7" font-size="12" font-family="sans-serif">BACK</text>
      <g fill="#2b3441">
        <circle cx="120" cy="38" r="19"/><rect x="113" y="54" width="14" height="14" rx="4"/>
        <rect x="100" y="188" width="40" height="26" rx="8"/>
        <circle cx="58" cy="208" r="7"/><circle cx="182" cy="208" r="7"/>
        <ellipse cx="104" cy="404" rx="12" ry="7"/><ellipse cx="136" cy="404" rx="12" ry="7"/>
        <circle cx="340" cy="38" r="19"/><rect x="333" y="54" width="14" height="14" rx="4"/>
        <circle cx="278" cy="208" r="7"/><circle cx="402" cy="208" r="7"/>
        <ellipse cx="324" cy="404" rx="12" ry="7"/><ellipse cx="356" cy="404" rx="12" ry="7"/>
      </g>
      ${M('shoulders', [
        { t: 'ellipse', a: 'cx="86" cy="90" rx="16" ry="14"' },
        { t: 'ellipse', a: 'cx="154" cy="90" rx="16" ry="14"' },
      ])}
      ${M('chest', [
        { t: 'ellipse', a: 'cx="105" cy="114" rx="17" ry="13"' },
        { t: 'ellipse', a: 'cx="135" cy="114" rx="17" ry="13"' },
      ])}
      ${M('abdominals', [{ t: 'rect', a: 'x="104" y="130" width="32" height="56" rx="9"' }])}
      ${M('biceps', [
        { t: 'ellipse', a: 'cx="72" cy="128" rx="11" ry="23"' },
        { t: 'ellipse', a: 'cx="168" cy="128" rx="11" ry="23"' },
      ])}
      ${M('forearms', [
        { t: 'ellipse', a: 'cx="64" cy="178" rx="10" ry="24"' },
        { t: 'ellipse', a: 'cx="176" cy="178" rx="10" ry="24"' },
      ])}
      ${M('quadriceps', [
        { t: 'ellipse', a: 'cx="104" cy="258" rx="16" ry="44"' },
        { t: 'ellipse', a: 'cx="136" cy="258" rx="16" ry="44"' },
      ])}
      ${M('calves', [
        { t: 'ellipse', a: 'cx="105" cy="350" rx="13" ry="34"' },
        { t: 'ellipse', a: 'cx="135" cy="350" rx="13" ry="34"' },
      ])}
      ${M('shoulders', [
        { t: 'ellipse', a: 'cx="306" cy="90" rx="15" ry="13"' },
        { t: 'ellipse', a: 'cx="374" cy="90" rx="15" ry="13"' },
      ])}
      ${M('traps', [{ t: 'path', a: 'd="M322 76 q18 -12 36 0 l-6 22 q-12 6 -24 0 z"' }])}
      ${M('lats', [
        { t: 'ellipse', a: 'cx="316" cy="130" rx="13" ry="22"' },
        { t: 'ellipse', a: 'cx="364" cy="130" rx="13" ry="22"' },
      ])}
      ${M('back', [{ t: 'rect', a: 'x="328" y="118" width="24" height="70" rx="8"' }])}
      ${M('triceps', [
        { t: 'ellipse', a: 'cx="292" cy="128" rx="11" ry="23"' },
        { t: 'ellipse', a: 'cx="388" cy="128" rx="11" ry="23"' },
      ])}
      ${M('forearms', [
        { t: 'ellipse', a: 'cx="284" cy="178" rx="10" ry="24"' },
        { t: 'ellipse', a: 'cx="396" cy="178" rx="10" ry="24"' },
      ])}
      ${M('glutes', [
        { t: 'ellipse', a: 'cx="326" cy="220" rx="15" ry="16"' },
        { t: 'ellipse', a: 'cx="354" cy="220" rx="15" ry="16"' },
      ])}
      ${M('hamstrings', [
        { t: 'ellipse', a: 'cx="324" cy="276" rx="14" ry="38"' },
        { t: 'ellipse', a: 'cx="356" cy="276" rx="14" ry="38"' },
      ])}
      ${M('calves', [
        { t: 'ellipse', a: 'cx="324" cy="350" rx="13" ry="34"' },
        { t: 'ellipse', a: 'cx="356" cy="350" rx="13" ry="34"' },
      ])}
    </svg>`;
  }
  const _mediaCache = {};
  let _demoTimer = null;
  const EXIMG_BASE =
    'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';
  const exImg = (p) => EXIMG_BASE + encodeURI(p);
  async function fetchExerciseMedia(id) {
    if (id in _mediaCache) return _mediaCache[id];
    const { data } = await sb
      .from('exercise_with_media')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    _mediaCache[id] = data || null;
    return _mediaCache[id];
  }
  async function openExerciseDemo(id, name) {
    const bg = el('div', 'sheet-bg');
    bg.onclick = (e) => {
      if (e.target === bg) closeSheet();
    };
    const sh = el('div', 'sheet');
    sh.innerHTML = `<div class="sheet-hd"><h3>${esc(name)}</h3><button class="btn xs sec" id="dmClose">Close</button></div>
      <div class="sheet-body demo-wrap"><div id="dmBody"><div class="empty"><span class="spin"></span></div></div></div>`;
    bg.appendChild(sh);
    $('#sheet').innerHTML = '';
    $('#sheet').appendChild(bg);
    $('#dmClose').onclick = closeSheet;
    const m = await fetchExerciseMedia(id);
    const body = $('#dmBody');
    if (!body) return;
    if (!m) {
      body.innerHTML =
        '<div class="empty">No library data for this exercise.</div>';
      return;
    }
    const tag = (a) =>
      a && a.length
        ? a.map((x) => `<span class="demo-tag">${esc(x)}</span>`).join('')
        : '<span style="opacity:.5">—</span>';
    body.innerHTML = `
      <div class="demo-map">${heatmapSVG()}
        <div class="demo-legend">
          <span><i style="background:#ef4444"></i>Primary</span>
          <span><i style="background:#f59e0b"></i>Secondary</span>
          <span><i style="background:#46525f"></i>Not emphasised</span>
        </div>
      </div>
      <div class="demo-muscles"><b>Primary:</b> ${tag(m.primary_muscles)}<br><b>Secondary:</b> ${tag(m.secondary_muscles)}</div>
      <div class="demo-viewer" id="dmViewer"></div>`;
    applyHeatmap(body, m.primary_muscles, m.secondary_muscles);
    renderMovement($('#dmViewer'), m);
  }
  function renderMovement(host, m) {
    if (_demoTimer) {
      clearInterval(_demoTimer);
      _demoTimer = null;
    }
    const angles = [];
    if (m.video_front_url) angles.push({ k: 'Front', url: m.video_front_url });
    if (m.video_side_url) angles.push({ k: 'Side', url: m.video_side_url });
    if (m.media_tier === 'video' && angles.length) {
      let cur = 0,
        rate = 1;
      const vid = el('video', 'demo-video');
      vid.loop = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.autoplay = true;
      vid.setAttribute('preload', 'metadata');
      if (m.poster_front_url) vid.poster = m.poster_front_url;
      vid.src = angles[0].url;
      host.appendChild(vid);
      const ctr = el('div', 'demo-controls');
      if (angles.length > 1) {
        const seg = el('div', 'seg');
        angles.forEach((a, i) => {
          const b = el('button', i === 0 ? 'on' : '', a.k);
          b.onclick = () => {
            if (i === cur) return;
            const t = vid.currentTime;
            cur = i;
            vid.src = angles[i].url;
            vid.onloadedmetadata = () => {
              try {
                vid.currentTime = t;
              } catch (e) {}
              vid.playbackRate = rate;
              vid.play();
            };
            [...seg.children].forEach((x) => x.classList.remove('on'));
            b.classList.add('on');
          };
          seg.appendChild(b);
        });
        ctr.appendChild(el('span', 'lbl', 'Angle'));
        ctr.appendChild(seg);
      }
      const spd = el('div', 'seg');
      [
        ['1×', 1],
        ['0.5×', 0.5],
        ['0.25×', 0.25],
      ].forEach(([lbl, r]) => {
        const b = el('button', r === 1 ? 'on' : '', lbl);
        b.onclick = () => {
          rate = r;
          vid.playbackRate = r;
          [...spd.children].forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
        };
        spd.appendChild(b);
      });
      ctr.appendChild(el('span', 'lbl', 'Speed'));
      ctr.appendChild(spd);
      host.appendChild(ctr);
      vid.playbackRate = rate;
      return;
    }
    const frames = (m.images || []).filter(Boolean).map(exImg);
    if (frames.length >= 2) {
      frames.forEach((u) => {
        const i = new Image();
        i.src = u;
      });
      let idx = 0,
        playing = true,
        period = 900;
      const img = el('img', 'demo-video');
      img.alt = 'Exercise movement demonstration';
      img.src = frames[0];
      host.appendChild(img);
      const showFrame = (i) => {
        idx = (i + frames.length) % frames.length;
        img.src = frames[idx];
      };
      const run = () => {
        if (_demoTimer) clearInterval(_demoTimer);
        _demoTimer = playing
          ? setInterval(() => showFrame(idx + 1), period)
          : null;
      };
      const ctr = el('div', 'demo-controls');
      const playSeg = el('div', 'seg');
      const pb = el('button', 'on', '⏸ Pause');
      pb.onclick = () => {
        playing = !playing;
        pb.textContent = playing ? '⏸ Pause' : '▶ Play';
        if (playing) run();
        else if (_demoTimer) {
          clearInterval(_demoTimer);
          _demoTimer = null;
        }
      };
      playSeg.appendChild(pb);
      ctr.appendChild(playSeg);
      const spd = el('div', 'seg');
      [
        ['1×', 900],
        ['0.5×', 1800],
        ['0.25×', 3600],
      ].forEach(([lbl, ms]) => {
        const b = el('button', ms === 900 ? 'on' : '', lbl);
        b.onclick = () => {
          period = ms;
          [...spd.children].forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
          if (playing) run();
        };
        spd.appendChild(b);
      });
      ctr.appendChild(el('span', 'lbl', 'Speed'));
      ctr.appendChild(spd);
      host.appendChild(ctr);
      host.appendChild(
        el(
          'div',
          'demo-cap',
          'Animated start → end positions from your exercise library.'
        )
      );
      run();
      return;
    }
    if (frames.length === 1) {
      host.innerHTML = `<img class="demo-video" src="${esc(frames[0])}" alt="Exercise demonstration">`;
      return;
    }
    host.innerHTML =
      '<div class="demo-fallback">🎬 Demonstration coming soon.<br>The muscle map above is live from your library data.</div>';
  }

  /* ---------- HISTORY + PRs ---------- */
  async function loadHistory() {
    const v = $('#historyView');
    v.innerHTML = '<div class="empty"><span class="spin"></span></div>';
    const [{ data: wk }, { data: prs }] = await Promise.all([
      sb
        .from('strength_workouts')
        .select('*')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(25),
      sb
        .from('exercise_prs')
        .select('*')
        .order('best_e1rm_kg', { ascending: false })
        .limit(12),
    ]);
    v.innerHTML = '';
    v.appendChild(el('div', 'section-title', 'Personal records (est. 1RM)'));
    if (prs && prs.length) {
      prs.forEach((p) => {
        const c = el('div', 'card');
        c.innerHTML = `<div class="row sp"><h3 style="font-size:15px">${esc(p.exercise_name || p.exercise_id)}</h3>
          <b style="color:var(--good)">${p.best_e1rm_kg ? Math.round(p.best_e1rm_kg) + ' kg' : '—'}</b></div>
          <div class="ex-target" style="margin-top:4px">Heaviest ${p.heaviest_kg ? Math.round(p.heaviest_kg) + 'kg' : '—'} · ${p.logged_sets} sets logged</div>`;
        v.appendChild(c);
      });
    } else {
      v.appendChild(el('div', 'empty', 'PRs appear once you complete sets.'));
    }
    v.appendChild(el('div', 'section-title', 'Recent sessions'));
    if (wk && wk.length) {
      wk.forEach((w) => {
        const c = el('div', 'card');
        const d = w.completed_at
          ? new Date(w.completed_at).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
          : w.workout_date;
        c.innerHTML = `<div class="row sp"><h3>${esc(w.label)}</h3><span class="pill ${w.origin === 'coach' ? 'coach' : w.origin === 'custom' ? 'custom' : 'template'}">${esc(w.origin || '')}</span></div>
          <div class="ex-target" style="margin-top:6px">${esc(d)}${w.srpe ? ' · sRPE ' + w.srpe : ''}</div>`;
        v.appendChild(c);
      });
    } else {
      v.appendChild(
        el(
          'div',
          'empty',
          'No completed workouts yet. Your saved sessions will show here.'
        )
      );
    }
  }

  /* ---------- init ---------- */
  (async () => {
    const {
      data: { user },
    } = await sb.auth.getUser();
    USER = user || null;
    if (!USER) {
      $('#homeView').innerHTML =
        '<div class="empty">Sign in on the dashboard to log strength sessions.</div>';
      return;
    }
    loadHome();
  })();

  /* ---------- cleanup on unmount ---------- */
  return () => {
    clearInterval(restTimer);
    clearTimeout(_tick);
    if (_demoTimer) clearInterval(_demoTimer);
  };
}

export default function StrengthLogger() {
  const rootRef = useRef(null);
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return; // guard against double-invoke
    initRef.current = true;
    const cleanup = mountStrengthLogger(rootRef.current);
    return () => {
      try {
        cleanup && cleanup();
      } catch (e) {}
    };
  }, []);
  return (
    <>
      <style>{CSS}</style>
      <div
        className="slog"
        ref={rootRef}
        dangerouslySetInnerHTML={{ __html: SKELETON }}
      />
    </>
  );
}
