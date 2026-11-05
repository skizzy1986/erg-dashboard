// ---------- rep model ----------
const REP = META.rep, RN = REP.s.length, DT = REP.dt, TT = (RN - 1)*DT, PD = META.pd, BW = META.bw, MBAR = META.mbar, GRAV = 9.81, ARM = META.arm || {};
const PHN = ['Setup and brace', 'Lowering', 'Bottom', 'Drive', 'Lockout'];
const PHMODE = ['Bracing: muscles hold position (isometric).', 'Prime movers lengthen under load (eccentric) and brake the bar.',
  'Reversal: prime movers at full stretch switch from braking to driving. Ground force peaks.', 'Prime movers shorten (concentric). Activation is highest just after the reversal.',
  'Finishing the drive while the bar slows. Breathe and re-brace.'];
const lerpArr = (arr, x) => { const i0 = Math.max(0, Math.min(arr.length - 2, Math.floor(x))), u = Math.min(1, Math.max(0, x - i0)); return arr[i0] + (arr[i0 + 1] - arr[i0])*u; };
const dAt = (s, k) => { const x = s*(NS - 1), i0 = Math.min(NS - 2, Math.floor(x)), u = x - i0; return RO[i0][k] + (RO[i0 + 1][k] - RO[i0][k])*u; };
const barY0 = RO[NS - 1].bx[1];
function repAt(t) {
  t = Math.max(0, Math.min(TT, t)); const x = t/DT, i = Math.round(x);
  const s = lerpArr(REP.s, x), v = lerpArr(REP.v, x), f = lerpArr(REP.f, x), ph = REP.ph[Math.min(RN - 1, i)];
  const asc = ph >= 3 || (ph === 2 && t >= REP.t_bottom);
  return {t, s, v, f, ph, asc};
}
const hAt = s => { const x = s*(NS - 1), i0 = Math.min(NS - 2, Math.floor(x)), u = x - i0; return (RO[i0].bx[1] + (RO[i0 + 1].bx[1] - RO[i0].bx[1])*u) - barY0; };
// sticking region as located in heavy reps (8-22 cm above the bottom, drive phase)
const STICK = (() => { let a = null, b = null; for (let i = 0; i < RN; i++) { if (REP.ph[i] !== 3) continue; const h = hAt(REP.s[i]); if (h >= .08 && a === null) a = i*DT; if (h <= .22) b = i*DT; } return [a, b]; })();
const timeOfDepth = d => { if (d >= .999) return REP.t_bottom; for (let i = 0; i < RN; i++) if (REP.ph[i] >= 1 && REP.s[i] >= d) return i*DT; return 0; };
const mi = n => MUS.findIndex(m => m.name === n);
const actOf = (k, s, asc) => { const a = MUS[k].act; if (!a) return 0; return lerpArr(a[asc ? 1 : 0], s*(NS - 1))/255; };
const lenOf = (k, s) => MUS[k].len ? lerpArr(MUS[k].len, s*(NS - 1)) : null;
// ---------- formatting ----------
const fmt = (v, dp) => { const t = (+v).toFixed(dp || 0); return (t === '-0' || t === '-0.0' || t === '-0.00') ? t.slice(1) : t.replace('-', '−'); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
// ---------- picking (3D tooltip) ----------
const ray = new THREE.Raycaster(), tip = $('tip'); let pinned = false, pickReq = null, pickedMuscle = -1;
function hideTip() { tip.style.opacity = 0; pinned = false; pickedMuscle = -1; }
function queuePick(x, y, tap) { pickReq = {x, y, tap}; }
function muscleModeText(m, st) {
  if (m.tendon) return ['Tendon: transmits force, not contractile', ''];
  if (m.mode === 'brace') return ['Isometric: bracing the trunk', 'iso'];
  if (m.mode === 'hold') return ['Isometric: holding the bar and the upper-back shelf', 'iso'];
  if (m.mode === 'stab') return ['Stabiliser: small length change, not tracked', 'iso'];
  if (st.ph === 0) return ['At rest length, braced', 'iso'];
  if (st.ph === 2) return ['Reversal: ' + (m.mode > 0 ? 'near its longest, switching from braking to driving' : 'switching direction'), 'iso'];
  if (st.ph === 4) return [m.mode > 0 ? 'Shortening to lockout (concentric)' : m.mode < 0 ? 'Lengthening back to standing' : 'Close to constant length', m.mode > 0 ? 'con' : 'iso'];
  const down = !st.asc, len = m.mode;
  if (len === 0) return ['Close to constant length (near-isometric)', 'iso'];
  if ((len > 0) === down) return ['Lengthening under load (eccentric)', 'ecc'];
  return ['Shortening (concentric)', 'con'];
}
function tipHtml(k, side, st) {
  const m = MUS[k]; const [mt, mc] = muscleModeText(m, st);
  let kv = '';
  if (!m.tendon) {
    kv += `<span>Estimated activation</span><b>${Math.round(curAct[k]*100)}%</b>`;
    if (m.act) { const other = actOf(k, st.s, !st.asc); if (st.ph === 1 || st.ph === 3) kv += `<span>${st.asc ? 'Lowering' : 'Drive'} at this depth</span><b>${Math.round(other*100)}%</b>`; }
    const L = lenOf(k, st.s); if (L !== null && m.mode !== 'stab') kv += `<span>Length vs standing</span><b>${Math.round(L)}%</b>`;
  }
  return `<b>${esc(m.name)}</b><span class="note">${side ? side + ' side' : 'Midline'}</span><br><span class="mode" data-m="${mc}">${mt}</span>${kv ? `<div class="kv">${kv}</div>` : ''}<p>${esc(m.role)}</p>`;
}
function doPick() {
  if (!pickReq) return; const {x, y, tap} = pickReq; pickReq = null; if (pinned && !tap) return;
  const r = canvas.getBoundingClientRect(); ray.setFromCamera({x: (x - r.left)/r.width*2 - 1, y: -(y - r.top)/r.height*2 + 1}, camera);
  const vis = pickables.filter(o => o.visible && o.parent.visible && o.parent.parent.visible);
  const hit = ray.intersectObjects(vis, false)[0];
  if (!hit) { hideTip(); return; }
  const o = hit.object, ud = o.userData, vi = hit.face.a; let html;
  if (ud.kind === 'bone') { const pid = o.geometry.attributes.pid.array[vi]; html = `<b>${esc(ud.names[pid])}</b><span class="note">${ud.side ? ud.side + ' side' : 'Midline'}</span>`; pickedMuscle = -1; }
  else { const k = o.geometry.attributes.mid.array[vi]; pickedMuscle = k; tip.dataset.side = ud.side || ''; html = tipHtml(k, ud.side, cur); }
  tip.innerHTML = html; pinned = tap;
  const tw = tip.offsetWidth, th = tip.offsetHeight; tip.style.left = Math.min(r.width - tw - 8, Math.max(8, x - r.left + 14)) + 'px';
  tip.style.top = Math.min(r.height - th - 8, Math.max(8, y - r.top + 14)) + 'px'; tip.style.opacity = 1;
}
// ---------- playback state ----------
let playing = !reduce, speed = 1, tNow = reduce ? REP.t_bottom : 0, last = performance.now(), opac = 1, cur = repAt(tNow);
function setPlay(p) { playing = p; $('play').textContent = p ? 'Pause' : 'Play'; }
setPlay(playing);
$('play').addEventListener('click', () => setPlay(!playing));
$('speed').addEventListener('input', e => speed = +e.target.value);
const tog = (id, fn) => $(id).addEventListener('click', () => { const on = $(id).getAttribute('aria-pressed') !== 'true'; $(id).setAttribute('aria-pressed', on); fn(on); });
tog('t-skel', on => { skelR.visible = skelL.visible = skelA.visible = on; });
tog('t-mus', on => { musR.visible = musL.visible = musA.visible = on; if (!on) hideTip(); });
tog('t-heat', on => { heat = on; $('legend').hidden = !on; needColor = true; });
tog('t-path', on => pathOn = on);
$('opac').addEventListener('input', e => { opac = +e.target.value; MAT.muscle.opacity = opac; MAT.muscle.transparent = opac < .99; MAT.muscle.depthWrite = opac > .6; MAT.muscle.needsUpdate = true; });
const card = document.querySelector('.card'), moreBtn = $('more'), formEl = $('form'), tlEl = document.querySelector('.tl');
const phone = matchMedia('(max-width: 760px)');
if (!phone.matches) card.classList.remove('compact');
const syncMore = () => { const c = card.classList.contains('compact'); moreBtn.setAttribute('aria-expanded', !c); moreBtn.textContent = c ? 'All readouts' : 'Fewer readouts'; };
moreBtn.addEventListener('click', () => { card.classList.toggle('compact'); syncMore(); }); syncMore();
const setFormCollapsed = c => { formEl.classList.toggle('collapsed', c); $('form-tog').textContent = c ? '+' : '–'; $('form-tog').setAttribute('aria-expanded', !c); $('form-tog').setAttribute('aria-label', c ? 'Expand form check' : 'Collapse form check'); };
$('form-tog').addEventListener('click', () => setFormCollapsed(!formEl.classList.contains('collapsed')));
if (phone.matches || innerWidth < 1000) setFormCollapsed(true);
// ---------- metric values used across the page ----------
const RB = RO[NS - 1], R0 = RO[0];
const mBot = k => RB[k];
const ratio = RB.Mhip/RB.Mknee;
const LEN_SHOW = [['Gluteus maximus', 'gluteus maximus'], ['Adductor magnus', 'adductor magnus'], ['Vastus lateralis', 'vastus lateralis'], ['Biceps femoris (long head)', 'biceps femoris long head'], ['Soleus', 'soleus'], ['Rectus femoris', 'rectus femoris']];
const lensTxt = LEN_SHOW.map(([n, lab]) => { const k = mi(n); const L = MUS[k].len[NS - 1] - 100; return `${lab} ${L >= 0 ? '+' : '−'}${Math.abs(Math.round(L))}%`; }).join(', ');
const fecc = (() => { let lo = 9, hi = 0; for (let i = 0; i < RN; i++) if (REP.ph[i] === 1) { lo = Math.min(lo, REP.f[i]); hi = Math.max(hi, REP.f[i]); } return [lo, hi]; })();
const flock = (() => { let lo = 9; for (let i = 0; i < RN; i++) if (REP.ph[i] >= 3) lo = Math.min(lo, REP.f[i]); return lo; })();
const KV = {
  er: `${Math.round(ARM.er)}°`, elbow: `${Math.round(ARM.elbow)}°`, elev: `${Math.round(ARM.elev)}°`, wrist: `${Math.round(ARM.wrist)}°`, grip: `${Math.round(ARM.grip)} cm`,
  ecc: `${fmt(REP.ecc, 2)} s`, con: `${fmt(REP.con, 2)} s`, trans: `${fmt(REP.trans, 2)} s`, mcv: `${fmt(REP.mcv, 2)} m/s`, vpk: `${fmt(REP.vpk, 2)} m/s`, vecc: `${fmt(REP.vecc, 2)} m/s`,
  fpk: `${fmt(REP.fpk, 2)}× system weight`, fecc: `${fmt(fecc[0], 2)}–${fmt(fecc[1], 2)}× system weight`, flock: `down to ${fmt(flock, 2)}× system weight`,
  depthtxt: `hip ${fmt(-mBot('depth'), 1)} cm below knee`, lord: `${Math.round(R0.lord)}° → ${Math.round(RB.lord)}°`, lens: lensTxt,
  sticktxt: '8–22 cm above the bottom',
  cop0: `${Math.round(R0.cop)}%`, cop1: `${Math.round(RB.cop)}%`,
};
document.querySelectorAll('[data-k]').forEach(el => { if (KV[el.dataset.k] !== undefined) el.textContent = KV[el.dataset.k]; });
// ---------- form check (rep-level, model or measured) ----------
let meas = null, showMeas = false;
const thighBelow = (knee, ankle) => knee - ankle - 90;     // flat foot: thigh angle below horizontal from knee flexion and shank inclination
function checksFor(src) {
  const M = src === 'meas' && meas ? meas : null; const C = [];
  const st = (ok, warn) => ok ? 'good' : warn ? 'warn' : 'bad';
  const NA = (name, ref, tab, t) => C.push({name, s: 'na', val: 'Not in the measured file', ref, tab, t});
  // 1 bar path
  if (!M) C.push({name: 'Bar path over midfoot', s: 'good', val: `${fmt(Math.max(...RO.map(r => Math.abs(r.bar))), 0)} mm drift, vertical path`, ref: 'Target: within ±25 mm of midfoot all rep', tab: 'force', t: REP.t_bottom});
  else NA('Bar path over midfoot', 'Needs bar position (video or position tracker)', 'force', REP.t_bottom);
  // 2 depth
  if (!M) C.push({name: 'Depth', s: 'good', val: `Hip ${fmt(-RB.depth, 1)} cm below knee, thighs ${fmt(RB.thigh, 0)}° below parallel`, ref: 'IPF: hip crease below top of knee. Assessment standard: thighs at least parallel', tab: 'angles', t: REP.t_bottom});
  else if (M.knee) { const tb = thighBelow(M.knee.max, M.ankle ? M.ankle.atBottom : RB.ankle); C.push({name: 'Depth', s: st(tb >= 0, tb >= -5), val: `Thighs ${fmt(Math.abs(tb), 0)}° ${tb >= 0 ? 'below' : 'above'} parallel (knee ${fmt(M.knee.max, 0)}°)`, ref: 'Thighs at least parallel. Estimated from knee flexion and shin angle', tab: 'angles', t: REP.t_bottom}); }
  else NA('Depth', 'Needs knee angle', 'angles', REP.t_bottom);
  // 3 knees over toes
  if (!M) C.push({name: 'Knees track over toes', s: 'good', val: `${fmt(RB.klat, 1)} cm outside the heel to second-toe line at depth`, ref: 'Target: 0 to +3 cm, no inward collapse', tab: 'angles', t: REP.t_bottom});
  else NA('Knees track over toes', 'Needs frontal-plane knee position', 'angles', REP.t_bottom);
  // 4 trunk vs shin
  if (!M) C.push({name: 'Trunk parallel to shin', s: 'good', val: `Trunk ${fmt(RB.lean, 0)}°, shin ${fmt(RB.shin, 0)}° at depth (${fmt(Math.abs(RB.lean - RB.shin), 0)}° apart)`, ref: 'Target: within 6°. Assessment standard: tibia parallel with the trunk', tab: 'angles', t: REP.t_bottom});
  else if (M.lean && M.ankle) { const d = M.lean.atBottom - M.ankle.atBottom; C.push({name: 'Trunk parallel to shin', s: st(Math.abs(d) <= 6, Math.abs(d) <= 12), val: `Trunk ${fmt(M.lean.atBottom, 0)}°, shin ${fmt(M.ankle.atBottom, 0)}° (${fmt(Math.abs(d), 0)}° apart)`, ref: 'Target: within 6°. Trunk from pelvis tilt and lumbar angle', tab: 'angles', t: REP.t_bottom}); }
  else NA('Trunk parallel to shin', 'Needs pelvis tilt, lumbar and ankle angles', 'angles', REP.t_bottom);
  // 5 lumbar
  if (!M) C.push({name: 'Lower-back curve held', s: 'good', val: `${fmt(RB.lumbar, 0)}° lumbar flexion, curve still ${fmt(RB.lord, 0)}° lordotic`, ref: 'Trained lifters: 13–26° under load (McKean 2010). Watch for the pelvis tucking under', tab: 'angles', t: REP.t_bottom});
  else if (M.lumbar) { const fl = M.lumbar.flex; C.push({name: 'Lower-back curve held', s: st(fl <= 26, fl <= 32), val: `${fmt(fl, 0)}° lumbar flexion from standing`, ref: 'Trained lifters: 13–26° under load (McKean 2010)', tab: 'angles', t: REP.t_bottom}); }
  else NA('Lower-back curve held', 'Needs lumbar angle', 'angles', REP.t_bottom);
  // 6 balance
  if (!M) C.push({name: 'Whole foot loaded', s: 'good', val: `Centre of pressure ${fmt(R0.cop, 0)}% → ${fmt(RB.cop, 0)}% of foot from heel`, ref: 'Target: 25–60%, heels down, toes relaxed', tab: 'force', t: REP.t_bottom});
  else NA('Whole foot loaded', 'Needs force plates or pressure insoles', 'force', REP.t_bottom);
  // 7 hip:knee
  if (!M) C.push({name: 'Hip and knee share the load', s: 'good', val: `Hip to knee moment ratio ${fmt(ratio, 2)} at depth`, ref: 'High-bar about 1.2, low-bar about 2.3 (Wretenberg 1996)', tab: 'moments', t: REP.t_bottom});
  else NA('Hip and knee share the load', 'Needs ground force with motion capture', 'moments', REP.t_bottom);
  // 8 ankle
  if (!M) C.push({name: 'Ankle mobility', s: 'good', val: `${fmt(RB.ankle, 0)}° dorsiflexion at depth, heels down`, ref: 'High-bar weightlifters use about 32° ankle range (Glassbrook 2019)', tab: 'angles', t: REP.t_bottom});
  else if (M.ankle) { const a = M.ankle.max; C.push({name: 'Ankle mobility', s: st(a >= 25, a >= 18), val: `${fmt(a, 0)}° peak dorsiflexion`, ref: 'Below about 25° the heels tend to lift or the trunk leans further', tab: 'angles', t: REP.t_bottom}); }
  else NA('Ankle mobility', 'Needs ankle angle', 'angles', REP.t_bottom);
  // 9 tempo and speed
  if (!M) C.push({name: 'Tempo and bar speed', s: 'good', val: `${fmt(REP.ecc, 2)} s down, ${fmt(REP.con, 2)} s up, ${fmt(REP.mcv, 2)} m/s mean drive`, ref: 'Controlled 1.5–2 s descent. 0.59–0.67 m/s ≈ 80–85% 1RM (Sánchez-Medina 2017)', tab: 'force', t: REP.t_bottom + .3});
  else if (M.ecc || M.mcv) { const ok = M.ecc ? M.ecc >= 1.2 : true; C.push({name: 'Tempo and bar speed', s: st(ok, M.ecc ? M.ecc >= .8 : true), val: `${M.ecc ? fmt(M.ecc, 2) + ' s down' : ''}${M.con ? ', ' + fmt(M.con, 2) + ' s up' : ''}${M.mcv ? ', ' + fmt(M.mcv, 2) + ' m/s mean drive' : ''}`, ref: M.pct ? `Velocity table puts this at about ${Math.round(M.pct)}% 1RM` : 'Controlled 1.5–2 s descent', tab: 'force', t: REP.t_bottom + .3}); }
  else NA('Tempo and bar speed', 'Needs time-stamped angles or bar velocity', 'force', REP.t_bottom);
  // 10 upper back
  if (!M) C.push({name: 'Upper back and grip set', s: 'good', val: `Shoulder blades retracted, elbows down, wrist within ${Math.round(ARM.wrist)}° of straight`, ref: `Shoulder external rotation ${Math.round(ARM.er)}° is the top of normal range. If it is out of reach, widen the grip`, tab: 'act', t: .3});
  else NA('Upper back and grip set', 'Needs upper-limb tracking', 'act', .3);
  return C;
}
function renderChecks() {
  const C = checksFor(showMeas ? 'meas' : 'model'), ol = $('checks'); ol.textContent = '';
  const n = C.filter(c => c.s !== 'na').length, ok = C.filter(c => c.s === 'good').length;
  $('score').textContent = n ? `${ok} of ${n} on target` : 'No checks available';
  for (const c of C) {
    const li = document.createElement('li'); li.dataset.s = c.s; li.tabIndex = 0;
    const ic = document.createElement('span'); ic.className = 'ic'; ic.setAttribute('aria-hidden', 'true'); ic.textContent = {good: '✓', warn: '!', bad: '×', na: '–'}[c.s];
    const nm = document.createElement('div'); nm.className = 'nm'; const a = document.createElement('span'); a.textContent = c.name; const b = document.createElement('span'); b.className = 'st'; b.textContent = {good: 'On target', warn: 'Borderline', bad: 'Off target', na: 'No data'}[c.s]; nm.append(a, b);
    const v = document.createElement('div'); v.className = 'val'; v.textContent = c.val;
    const r = document.createElement('div'); r.className = 'ref'; r.textContent = c.ref;
    li.append(ic, nm, v, r);
    const go = () => { setTab(c.tab); setPlay(false); tNow = c.t; };
    li.addEventListener('click', go); li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { go(); e.preventDefault(); } });
    ol.append(li);
  }
}
$('src-model').addEventListener('click', () => { showMeas = false; $('src-model').setAttribute('aria-pressed', 'true'); $('src-meas').setAttribute('aria-pressed', 'false'); renderChecks(); });
$('src-meas').addEventListener('click', () => { showMeas = true; $('src-meas').setAttribute('aria-pressed', 'true'); $('src-model').setAttribute('aria-pressed', 'false'); renderChecks(); });
renderChecks();
// ---------- metrics table ----------
(function () {
  const pk = BW; const rows = [
    ['Bar over midfoot', `${fmt(Math.max(...RO.map(r => Math.abs(r.bar))), 0)} mm drift`, 'Within ±25 mm (coaching standard). Experienced high-bar lifters: bar about 2 cm behind the centre of pressure at depth (Glassbrook 2019)', 'Balance and efficiency. A bar that drifts forward lengthens the hip and lower-back lever arms.'],
    ['Depth', `Hip ${fmt(-RB.depth, 1)} cm below knee; thighs ${fmt(RB.thigh, 0)}° below parallel`, 'IPF: hip crease below the top of the knee. Back squat assessment: thighs at least parallel (Myer 2014)', 'Competition standard and full range of motion.'],
    ['Knee flexion', `${fmt(RB.knee, 0)}°`, 'High-bar weightlifters at 1RM: about 124 ± 7° (Glassbrook 2019, converted from included angle)', 'How deep the knee works. This rep sits slightly deeper than the study mean.'],
    ['Hip flexion (pelvis to thigh)', `${fmt(RB.hip, 0)}°`, 'Studies define the hip angle differently, so compare like with like', 'Hip demand. Rises with depth and with forward lean.'],
    ['Ankle dorsiflexion', `${fmt(R0.ankle, 0)}° → ${fmt(RB.ankle, 0)}°`, 'High-bar weightlifters: about 32 ± 3° range (Glassbrook 2019)', 'Lets the knees travel forward with the heels down.'],
    ['Trunk lean vs shin', `${fmt(RB.lean, 0)}° vs ${fmt(RB.shin, 0)}°`, 'Trunk roughly parallel to the tibia (Myer 2014)', 'The upright high-bar pattern. A trunk much flatter than the shins shifts load to the hips and back.'],
    ['Lumbar flexion and lordosis', `${fmt(RB.lumbar, 0)}° flexion; curve ${fmt(R0.lord, 0)}° → ${fmt(RB.lord, 0)}°`, 'Trained lifters under load: 13–26° lumbar flexion during descent (McKean 2010)', 'A neutral spine still moves. The fault is end-range flexion at the bottom.'],
    ['Knee tracking', `${fmt(RB.klat, 1)} cm outside the toe line`, 'Knees over the toes, no inward collapse (Myer 2014)', 'Frontal-plane control of hip and knee.'],
    ['Centre of pressure', `${fmt(R0.cop, 0)}% → ${fmt(RB.cop, 0)}% of foot from heel`, 'Inside 25–60% with heels down (coaching standard)', 'Where the lifter is balanced. With the bar over midfoot it moves toward the heel as the hips go back.'],
    ['Hip to knee moment ratio', `${fmt(ratio, 2)} at depth`, 'High-bar about 1.2 (hip 230, knee 191 N·m); low-bar about 2.3 (Wretenberg 1996)', 'How the load is shared between the hip and knee extensors.'],
    ['Net joint moments, static at depth (per kg)', `Hip ${fmt(RB.Mhip/pk, 2)}, knee ${fmt(RB.Mknee/pk, 2)}, ankle ${fmt(RB.Mank/pk, 2)}, L5/S1 ${fmt(RB.Mlum/pk, 2)} N·m/kg`, 'Scale with load. The dynamic peak is up to ' + fmt(REP.fpk, 2) + '× these values', 'Mechanical demand on each joint.'],
    ['Vertical ground force', `${fmt(REP.fmin, 2)}–${fmt(REP.fpk, 2)}× system weight`, 'Peaks at the reversal in a touch-and-go rep', 'Braking on the way down, drive on the way up.'],
    ['Bar velocity', `${fmt(REP.vecc, 2)} m/s peak down; ${fmt(REP.mcv, 2)} mean, ${fmt(REP.vpk, 2)} peak up`, 'Full squat mean velocity: 0.67 m/s at 80%, 0.50 at 90%, 0.32 at 1RM (Sánchez-Medina 2017)', 'Load and fatigue monitoring with velocity-based training.'],
    ['Tempo', `${fmt(REP.ecc, 2)} s down, ${fmt(REP.trans, 2)} s around the bottom, ${fmt(REP.con, 2)} s up`, 'Controlled 1.5–2 s descent (coaching standard)', 'Time under tension and control of the braking phase.'],
    ['Sticking region', KV.sticktxt, 'Heavy reps: 8–22 cm above the bottom, knee about 80–100° included angle (ISBS 2014)', 'Where heavy reps slow down or fail. Train it with paused squats and pin squats.'],
    ['Shoulder, elbow and wrist', `External rotation ${Math.round(ARM.er)}°, elevation ${Math.round(ARM.elev)}°, elbow ${Math.round(ARM.elbow)}°, wrist within ${Math.round(ARM.wrist)}°`, 'External rotation near 90° is the top of normal range (ISB convention). Wrist within about 15° of neutral', 'Upper-back setup. Limited rotation shows up as bent wrists or flared elbows.'],
    ['Estimated activation', `Vastus lateralis ${Math.round(actOf(mi('Vastus lateralis'), .9, false)*100)}% lowering vs ${Math.round(actOf(mi('Vastus lateralis'), .9, true)*100)}% driving at 90% depth`, 'Estimated from joint moments, not EMG. Drive exceeds lowering at the same depth (Orantes-Gonzalez 2023; Enoka 1996)', 'Why the same depth is easier on the way down.'],
    ['Muscle length at the bottom', lensTxt, 'Musculotendon length from the model’s muscle paths', 'Which muscles work under stretch at depth.'],
  ];
  const tb = $('mtable').tBodies[0];
  for (const r of rows) { const tr = document.createElement('tr');
    const th = document.createElement('th'); th.scope = 'row'; th.textContent = r[0]; const why = document.createElement('span'); why.className = 'why'; why.textContent = r[3]; th.append(why); tr.append(th);
    const m = document.createElement('td'); m.className = 'n'; m.textContent = r[1]; const rf = document.createElement('td'); rf.textContent = r[2]; tr.append(m, rf); tb.append(tr); }
})();
// ---------- guide ----------
const guide = $('guide');
$('guide-open').addEventListener('click', () => { guide.hidden = !guide.hidden; });
$('guide-open2').addEventListener('click', () => { guide.hidden = !guide.hidden; });
$('guide-close').addEventListener('click', () => { guide.hidden = true; });
guide.querySelectorAll('nav [data-pane]').forEach(b => b.addEventListener('click', () => {
  guide.querySelectorAll('nav [data-pane]').forEach(x => x.setAttribute('aria-selected', x === b));
  guide.querySelectorAll('.pane').forEach(p => p.hidden = p.id !== b.dataset.pane);
}));
guide.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => { setPlay(false); tNow = b.dataset.goto === 'bottom' ? REP.t_bottom : +b.dataset.goto; }));
// ---------- charts ----------
const CS = getComputedStyle(document.documentElement);
const SER = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];
const T = Array.from({length: RN}, (_, i) => i*DT);
const REPS = T.map(t => repAt(t));
const K = {VL: mi('Vastus lateralis'), GM: mi('Gluteus maximus'), AM: mi('Adductor magnus'), ES: mi('Longissimus thoracis'), RF: mi('Rectus femoris')};
const TABS = {
  angles: {plots: [{unit: '°', min: 0, max: 140, step: 20, dp: 0, series: [
    {name: 'Knee flexion', f: r => dAt(r.s, 'knee'), mk: 'knee'}, {name: 'Hip flexion', f: r => dAt(r.s, 'hip'), mk: 'hip'},
    {name: 'Trunk lean', f: r => dAt(r.s, 'lean'), mk: 'lean'}, {name: 'Ankle dorsiflexion', f: r => dAt(r.s, 'ankle'), mk: 'ankle'}],
    refs: [{t: 'bottom', lo: 117, hi: 131, label: 'Bracket: knee 124 ± 7° in high-bar lifters at 1RM (Glassbrook 2019)'}]}], unitLong: 'Degrees. Hip is pelvis to thigh.'},
  moments: {plots: [{unit: 'N·m/kg', min: -1, max: 0, step: 1, dp: 2, series: [
    {name: 'Hip extension', f: r => dAt(r.s, 'Mhip')*r.f/BW}, {name: 'Knee extension', f: r => dAt(r.s, 'Mknee')*r.f/BW},
    {name: 'Ankle plantarflexion', f: r => dAt(r.s, 'Mank')*r.f/BW}, {name: 'L5/S1, whole trunk', f: r => dAt(r.s, 'Mlum')*r.f/BW}]}], unitLong: 'N·m per kg body mass. Hip, knee and ankle per leg.'},
  force: {plots: [
    {unit: '× wt', min: .6, max: 1.4, step: .4, dp: 2, h: .5, series: [{name: 'Vertical ground force', f: r => r.f, mk: 'f'}], base: 1},
    {unit: 'm/s', min: -.6, max: 1.2, step: .6, dp: 2, h: .5, series: [{name: 'Bar velocity', f: r => r.v, mk: 'v'}], base: 0, refs: [{line: .67, label: 'Grey line: 0.67 m/s, the mean drive speed at 80% 1RM (Sánchez-Medina 2017)'}]}], unitLong: 'Force in multiples of lifter + bar weight. Velocity in m/s, up positive.'},
  act: {plots: [{unit: '%', min: 0, max: 100, step: 25, dp: 0, series: [
    {name: 'Vastus lateralis', f: r => actOf(K.VL, r.s, r.asc)*100}, {name: 'Gluteus maximus', f: r => actOf(K.GM, r.s, r.asc)*100},
    {name: 'Adductor magnus', f: r => actOf(K.AM, r.s, r.asc)*100}, {name: 'Erector spinae', f: r => actOf(K.ES, r.s, r.asc)*100}]}], unitLong: 'Estimated % of maximal activation, not EMG.'},
  len: {plots: [{unit: '% of standing', min: 80, max: 150, step: 10, dp: 0, series: [
    {name: 'Vastus lateralis', f: r => lenOf(K.VL, r.s)}, {name: 'Gluteus maximus', f: r => lenOf(K.GM, r.s)},
    {name: 'Adductor magnus', f: r => lenOf(K.AM, r.s)}, {name: 'Rectus femoris', f: r => lenOf(K.RF, r.s)}]}], unitLong: 'Musculotendon length, % of standing.'},
};
for (const tab of Object.values(TABS)) for (const p of tab.plots) {
  for (const s of p.series) s.y = REPS.map(s.f);
  if (p.max === 0) { const hi = Math.max(...p.series.flatMap(s => s.y)); p.max = Math.ceil(hi/p.step)*p.step; }
}
let tabName = 'angles';
const svg = $('svg'), chart = $('chart'), ttip = $('ttip'), leg = $('leg');
const NSV = 'http://www.w3.org/2000/svg';
const sfx = p => p.unit[0] === '%' ? '%' : p.unit === '°' ? '°' : p.unit === '× wt' ? '×' : p.unit === 'm/s' ? ' m/s' : '';
chart.setAttribute('aria-valuemax', TT.toFixed(2));
const el = (tag, at, parent) => { const e = document.createElementNS(NSV, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
let geom = null, ph_line = null, dots = [], hov = null;
function bandsOf() { const out = []; let a = 0; for (let i = 1; i <= RN; i++) if (i === RN || REP.ph[i] !== REP.ph[a]) { out.push([REP.ph[a], a*DT, (i - 1)*DT]); a = i; } return out; }
const BANDS = bandsOf();
function drawChart() {
  const W = chart.clientWidth, H = chart.clientHeight; if (!W || H < 70) return;
  svg.textContent = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const tab = TABS[tabName], L = 40, R = 6, top = 15, bot = 16, X = t => L + (t/TT)*(W - L - R);
  geom = {W, H, L, R, X, plots: []};
  // phase bands across the whole height
  const bandFill = {1: 'var(--ecc)', 2: 'var(--trans)', 3: 'var(--con)'};
  const lbl = {1: 'Lowering', 2: 'Bottom', 3: 'Drive'};
  for (const [p, a, b] of BANDS) {
    if (bandFill[p]) el('rect', {x: X(a), y: top - 2, width: Math.max(1, X(b) - X(a)), height: H - top - bot + 2, fill: bandFill[p]}, svg);
    if (lbl[p] && X(b) - X(a) > 40) { const tx = el('text', {x: (X(a) + X(b))/2, y: 10, 'text-anchor': 'middle', class: 'bandlbl'}, svg); tx.textContent = lbl[p]; }
  }
  if (STICK[0] !== null) {
    el('rect', {x: X(STICK[0]), y: top - 2, width: X(STICK[1]) - X(STICK[0]), height: H - top - bot + 2, fill: 'var(--stick)'}, svg);
    const tx = el('text', {x: X(STICK[1]) + 3, y: top + 9, class: 'bandlbl', 'text-anchor': 'start'}, svg); tx.textContent = 'Sticking';
  }
  // plots (stacked)
  let y0 = top; const avail = H - top - bot, gap = tab.plots.length > 1 ? 20 : 0;
  tab.plots.forEach((p, pi) => {
    const ph = (avail - gap*(tab.plots.length - 1))*(p.h || 1), yb = y0, Y = v => yb + ph - (v - p.min)/(p.max - p.min)*ph;
    const g = el('g', {}, svg);
    for (let v = p.min; v <= p.max + 1e-9; v += p.step) {
      const yy = Y(v); el('line', {x1: L, x2: W - R, y1: yy, y2: yy, stroke: 'var(--grid)', 'stroke-width': 1}, g);
      const tx = el('text', {x: L - 5, y: yy + 3.5, 'text-anchor': 'end'}, g); tx.textContent = fmt(v, p.step < 1 ? (p.step < .5 ? 1 : 1) : 0);
    }
    if (p.base !== undefined) el('line', {x1: L, x2: W - R, y1: Y(p.base), y2: Y(p.base), stroke: 'var(--axis)', 'stroke-width': 1}, g);
    if (tab.plots.length === 1) { const ut = el('text', {x: L - 5, y: y0 - 3, 'text-anchor': 'end'}, g); ut.textContent = p.unit; }
    // reference markers
    for (const rf of p.refs || []) {
      if (rf.line !== undefined) {
        const ys = Y(rf.line), xa = X(REP.t_bottom), xb = X(REP.t_end);
        el('line', {x1: xa, x2: xb, y1: ys, y2: ys, stroke: 'var(--muted)', 'stroke-width': 1}, g);
      } else {
        const xs = X(REP.t_bottom) + 12, ya = Y(rf.hi), yb2 = Y(rf.lo);
        el('line', {x1: xs, x2: xs, y1: ya, y2: yb2, stroke: 'var(--muted)', 'stroke-width': 1.5}, g);
        el('line', {x1: xs - 3, x2: xs + 3, y1: ya, y2: ya, stroke: 'var(--muted)', 'stroke-width': 1.5}, g);
        el('line', {x1: xs - 3, x2: xs + 3, y1: yb2, y2: yb2, stroke: 'var(--muted)', 'stroke-width': 1.5}, g);

      }
    }
    // series
    p.series.forEach((s, si) => {
      const col = SER[p.series.length === 1 ? pi : si];
      let d = ''; for (let i = 0; i < RN; i += 1) { if (s.y[i] === null || s.y[i] === undefined) continue; d += (d ? 'L' : 'M') + X(T[i]).toFixed(1) + ',' + Y(s.y[i]).toFixed(1); }
      el('path', {d, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}, g);
      // measured overlay
      if (meas && meas.series && s.mk && meas.series[s.mk]) {
        const m = meas.series[s.mk]; let dm = ''; for (let i = 0; i < m.length; i++) { if (m[i] === null) { dm += ''; continue; } dm += (dm && m[i - 1] !== null ? 'L' : 'M') + X(T[i]).toFixed(1) + ',' + Y(m[i]).toFixed(1); }
        el('path', {d: dm, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-dasharray': '5 4', 'stroke-linecap': 'round', opacity: .95}, g);
      }
    });
    geom.plots.push({Y, p, y0, ph});
    y0 += ph + gap;
  });
  // x axis
  for (let t = 0; t <= TT + 1e-6; t += .5) { const tx = el('text', {x: X(t), y: H - 3, 'text-anchor': t === 0 ? 'start' : 'middle'}, svg); tx.textContent = t === 0 ? '0 s' : fmt(t, 1); }
  // playhead + dots
  ph_line = el('line', {y1: top - 2, y2: H - bot, stroke: 'var(--ink)', 'stroke-width': 1.5}, svg);
  hov = el('line', {y1: top - 2, y2: H - bot, stroke: 'var(--muted)', 'stroke-width': 1, opacity: 0}, svg);
  dots = [];
  geom.plots.forEach(({p}, pi) => p.series.forEach((s, si) => { const c = el('circle', {r: 4, fill: SER[p.series.length === 1 ? pi : si], stroke: 'var(--solid)', 'stroke-width': 2}, svg); dots.push({c, s, pi}); }));
  buildLegend(); lastChartT = -1;
}
function buildLegend() {
  leg.textContent = '';
  const tab = TABS[tabName];
  tab.plots.forEach((p, pi) => p.series.forEach((s, si) => {
    const row = document.createElement('div'); row.className = 'row';
    const k = document.createElement('span'); k.className = 'key'; k.style.background = SER[p.series.length === 1 ? pi : si];
    const lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = s.name;
    const v = document.createElement('span'); v.className = 'v'; s.vEl = v;
    row.append(k, lab, v); leg.append(row);
  }));
  for (const p of tab.plots) for (const rf of p.refs || []) { const r = document.createElement('div'); r.className = 'unit'; r.textContent = rf.label; leg.append(r); }
  const u = document.createElement('div'); u.className = 'unit';
  u.textContent = tab.unitLong + (meas && meas.series && Object.keys(meas.series).length ? ' · dashed: measured rep' : '');
  leg.append(u);
}
let lastChartT = -1;
function updateChart(t) {
  if (!geom || t === lastChartT) return; lastChartT = t;
  const x = geom.X(t); ph_line.setAttribute('x1', x); ph_line.setAttribute('x2', x);
  const r = repAt(t);
  for (const d of dots) { const {Y, p} = geom.plots[d.pi]; const v = d.s.f(r); if (v === null) { d.c.setAttribute('opacity', 0); continue; } d.c.setAttribute('opacity', 1); d.c.setAttribute('cx', x); d.c.setAttribute('cy', Y(v)); d.s.vEl.textContent = fmt(v, p.dp) + sfx(p); }
  chart.setAttribute('aria-valuenow', t.toFixed(2)); chart.setAttribute('aria-valuetext', `${t.toFixed(2)} s, ${PHN[r.ph]}`);
}
function setTab(name) {
  tabName = name; document.querySelectorAll('.tl [data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name)); drawChart();
}
document.querySelectorAll('.tl [data-tab]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
new ResizeObserver(() => drawChart()).observe(chart);
// scrub + hover
let scrubbing = false;
const tFromX = cx => { const r = chart.getBoundingClientRect(); return Math.max(0, Math.min(TT, (cx - r.left - geom.L)/(r.width - geom.L - geom.R)*TT)); };
chart.addEventListener('pointerdown', e => { if (!geom) return; scrubbing = true; chart.setPointerCapture(e.pointerId); setPlay(false); tNow = tFromX(e.clientX); });
chart.addEventListener('pointermove', e => {
  if (!geom) return; const t = tFromX(e.clientX);
  if (scrubbing) { tNow = t; ttip.style.opacity = 0; return; }
  const r = repAt(t), x = geom.X(t); hov.setAttribute('x1', x); hov.setAttribute('x2', x); hov.setAttribute('opacity', 1);
  let h = `<div class="h">${t.toFixed(2)} s · ${PHN[r.ph]}</div>`;
  TABS[tabName].plots.forEach((p, pi) => p.series.forEach((s, si) => { const v = s.f(r); if (v === null) return; h += `<div class="r"><i style="background:${SER[p.series.length === 1 ? pi : si]}"></i><b>${fmt(v, p.dp)}${sfx(p) || ' ' + p.unit}</b><span>${esc(s.name)}</span></div>`; }));
  ttip.innerHTML = h; const cr = chart.getBoundingClientRect(); const tw = ttip.offsetWidth;
  ttip.style.left = Math.min(cr.width - tw, Math.max(0, e.clientX - cr.left + 12)) + 'px'; ttip.style.top = '0px'; ttip.style.opacity = 1;
});
const endScrub = () => { scrubbing = false; };
chart.addEventListener('pointerup', endScrub); chart.addEventListener('pointercancel', endScrub);
chart.addEventListener('pointerleave', () => { ttip.style.opacity = 0; if (hov) hov.setAttribute('opacity', 0); });
chart.addEventListener('keydown', e => {
  const st = e.shiftKey ? .2 : .04;
  if (e.key === 'ArrowLeft') { setPlay(false); tNow = Math.max(0, tNow - st); e.preventDefault(); }
  else if (e.key === 'ArrowRight') { setPlay(false); tNow = Math.min(TT, tNow + st); e.preventDefault(); }
  else if (e.key === 'Home') { setPlay(false); tNow = 0; e.preventDefault(); } else if (e.key === 'End') { setPlay(false); tNow = TT; e.preventDefault(); }
  else if (e.key === ' ') { setPlay(!playing); e.preventDefault(); }
});
// event strip
$('events').innerHTML = [`Lowering <b>${fmt(REP.ecc, 2)} s</b>`, `Bottom <b>${fmt(REP.trans, 2)} s</b>`, `Drive <b>${fmt(REP.con, 2)} s</b>`, `Mean drive speed <b>${fmt(REP.mcv, 2)} m/s</b>`, `Peak ground force <b>${fmt(REP.fpk, 2)}× wt</b>`, `Sticking region <b>${KV.sticktxt.replace(' above the bottom', '')}</b>`].map(s => `<span>${s}</span>`).join('');
// ---------- measured rep import ----------
const MV_TABLE = [[1.08, 50], [.95, 60], [.82, 70], [.67, 80], [.50, 90], [.42, 95], [.32, 100]];
function pctFromMV(v) { if (v >= MV_TABLE[0][0]) return 50; if (v <= .32) return 100; for (let i = 0; i < MV_TABLE.length - 1; i++) { const [v0, p0] = MV_TABLE[i], [v1, p1] = MV_TABLE[i + 1]; if (v <= v0 && v >= v1) return p0 + (p1 - p0)*(v0 - v)/(v0 - v1); } return null; }
function parseTable(text) {
  const lines = text.split(/\r?\n/); let i = 0, inDeg = true;
  const eh = lines.findIndex(l => /^\s*endheader\s*$/i.test(l));
  if (eh >= 0) { for (let k = 0; k < eh; k++) if (/inDegrees\s*=\s*no/i.test(lines[k])) inDeg = false; i = eh + 1; }
  while (i < lines.length && !lines[i].trim()) i++;
  const sep = lines[i].includes('\t') ? '\t' : lines[i].includes(',') ? ',' : lines[i].includes(';') ? ';' : /\s+/;
  const head = lines[i].split(sep).map(s => s.trim().replace(/^"|"$/g, '')); const cols = head.map(() => []);
  for (let k = i + 1; k < lines.length; k++) { const p = lines[k].trim(); if (!p) continue; const v = p.split(sep).map(Number); if (v.some(x => Number.isNaN(x))) continue; v.forEach((x, j) => { if (j < cols.length) cols[j].push(x); }); }
  return {head, cols, inDeg};
}
function pick(tbl, names) { const H = tbl.head.map(h => h.toLowerCase()); for (const n of names) { const j = H.findIndex(h => h === n || h.startsWith(n)); if (j >= 0) return tbl.cols[j]; } return null; }
const smooth = (a, w) => a.map((_, i) => { let s = 0, n = 0; for (let k = Math.max(0, i - w); k <= Math.min(a.length - 1, i + w); k++) { s += a[k]; n++; } return s/n; });
function analyse(tbl, fname) {
  const time = pick(tbl, ['time', 't', 'time (s)', 'timestamp']); if (!time) throw new Error('No time column was found. The file needs a column named time.');
  const conv = tbl.inDeg ? (a => a) : (a => a && a.map(x => x*180/Math.PI));
  const knee = conv(pick(tbl, ['knee_angle_r', 'knee_angle_l', 'knee_flexion', 'knee'])), hip = conv(pick(tbl, ['hip_flexion_r', 'hip_flexion_l', 'hip'])), ankle = conv(pick(tbl, ['ankle_angle_r', 'ankle_angle_l', 'ankle']));
  const lumbar = conv(pick(tbl, ['lumbar_extension', 'lumbar'])), pelvis = conv(pick(tbl, ['pelvis_tilt']));
  const vel = pick(tbl, ['velocity', 'bar_velocity', 'vel', 'v (m/s)', 'velocity (m/s)']);
  const out = {name: fname, series: {}};
  const toModel = (tb, arr, t0, t1, t2) => {   // map measured [t0,t1] -> model descent, [t1,t2] -> model ascent
    const res = new Array(RN).fill(null);
    for (let i = 0; i < RN; i++) { const t = T[i]; let tm;
      if (t < REP.t_start) tm = t0 - (REP.t_start - t); else if (t <= REP.t_bottom) tm = t0 + (t - REP.t_start)/(REP.t_bottom - REP.t_start)*(t1 - t0);
      else if (t <= REP.t_end) tm = t1 + (t - REP.t_bottom)/(REP.t_end - REP.t_bottom)*(t2 - t1); else tm = t2 + (t - REP.t_end);
      if (tm < tb[0] || tm > tb[tb.length - 1]) continue;
      let lo = 0, hi = tb.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tb[m] <= tm) lo = m; else hi = m; }
      const u = (tm - tb[lo])/((tb[hi] - tb[lo]) || 1); res[i] = arr[lo] + (arr[hi] - arr[lo])*u; }
    return res; };
  if (knee) {
    const ks = smooth(knee, 2); let ib = 0; ks.forEach((v, i) => { if (v > ks[ib]) ib = i; });
    const kmin = Math.min(...ks), thr = kmin + .1*(ks[ib] - kmin);
    let is = ib; while (is > 0 && ks[is] > thr) is--; let ie = ib; while (ie < ks.length - 1 && ks[ie] > thr) ie++;
    const t0 = time[is], t1 = time[ib], t2 = time[ie];
    out.ecc = t1 - t0; out.con = t2 - t1;
    out.knee = {max: ks[ib]}; out.series.knee = toModel(time, knee, t0, t1, t2);
    if (hip) { out.hip = {max: hip[ib]}; out.series.hip = toModel(time, hip, t0, t1, t2); }
    if (ankle) { const as = smooth(ankle, 2); out.ankle = {max: Math.max(...as.slice(is, ie + 1)), atBottom: as[ib]}; out.series.ankle = toModel(time, ankle, t0, t1, t2); }
    if (lumbar) { const ls = smooth(lumbar, 2); out.lumbar = {flex: ls[is] - Math.min(...ls.slice(is, ie + 1))}; }
    if (pelvis && lumbar) { const lean = pelvis.map((p, i) => -(p + lumbar[i])); const l0 = lean[is]; const ln = lean.map(v => v - l0 + RO[0].lean); out.lean = {atBottom: ln[ib]}; out.series.lean = toModel(time, ln, t0, t1, t2); }
  }
  if (vel) {
    const vs = smooth(vel, 1); let ip = 0; vs.forEach((v, i) => { if (v > vs[ip]) ip = i; });
    let a = ip; while (a > 0 && vs[a - 1] > .01) a--; let b = ip; while (b < vs.length - 1 && vs[b + 1] > .01) b++;
    let mean = 0; for (let k = a; k <= b; k++) mean += vs[k]; mean /= (b - a + 1);
    let e = a - 1; while (e > 0 && vs[e] > -.01) e--; let es = e; while (es > 0 && vs[es - 1] < -.01) es--;
    out.mcv = mean; out.vpk = vs[ip]; out.pct = pctFromMV(mean); if (!out.con) out.con = time[b] - time[a]; if (!out.ecc && e > es) out.ecc = time[e] - time[es];
    if (!knee) out.series.v = toModel(time, vel, time[es], time[a], time[b]);
  }
  if (!knee && !vel) throw new Error('No usable columns were found. Expected knee_angle_r (or knee) for angles, or velocity for bar speed.');
  return out;
}
function showMeasured(m) {
  meas = m; formEl.classList.add('has-measured'); showMeas = true;
  $('src-meas').setAttribute('aria-pressed', 'true'); $('src-model').setAttribute('aria-pressed', 'false');
  renderChecks(); drawChart();
  const rows = [['Lowering time', `${fmt(REP.ecc, 2)} s`, m.ecc ? `${fmt(m.ecc, 2)} s` : '—'], ['Drive time', `${fmt(REP.con, 2)} s`, m.con ? `${fmt(m.con, 2)} s` : '—'],
    ['Peak knee flexion', `${fmt(RB.knee, 0)}°`, m.knee ? `${fmt(m.knee.max, 0)}°` : '—'], ['Peak hip flexion', `${fmt(RB.hip, 0)}°`, m.hip ? `${fmt(m.hip.max, 0)}°` : '—'],
    ['Peak ankle dorsiflexion', `${fmt(RB.ankle, 0)}°`, m.ankle ? `${fmt(m.ankle.max, 0)}°` : '—'], ['Lumbar flexion from standing', `${fmt(RB.lumbar, 0)}°`, m.lumbar ? `${fmt(m.lumbar.flex, 0)}°` : '—'],
    ['Mean drive velocity', `${fmt(REP.mcv, 2)} m/s`, m.mcv ? `${fmt(m.mcv, 2)} m/s` : '—'], ['Estimated load', '≈80–85% 1RM', m.pct ? `≈${Math.round(m.pct)}% 1RM` : '—']];
  const out = $('meas-out'); out.textContent = '';
  const p = document.createElement('p'); p.innerHTML = `<span class="pill"></span> Loaded and overlaid as dashed lines. Phases were found from knee flexion and time-scaled onto the reference rep.`; p.firstChild.textContent = m.name; out.append(p);
  const wrap = document.createElement('div'); wrap.className = 'tbl'; const tb = document.createElement('table'); tb.innerHTML = '<thead><tr><th>Measure</th><th>Reference rep</th><th>Measured</th></tr></thead><tbody></tbody>';
  for (const r of rows) { const tr = document.createElement('tr'); r.forEach((c, i) => { const td = document.createElement(i ? 'td' : 'th'); if (i) td.className = 'n'; else td.scope = 'row'; td.textContent = c; tr.append(td); }); tb.tBodies[0].append(tr); }
  wrap.append(tb); out.append(wrap);
  const clr = document.createElement('button'); clr.className = 'b'; clr.type = 'button'; clr.textContent = 'Remove measured rep';
  clr.addEventListener('click', () => { meas = null; showMeas = false; formEl.classList.remove('has-measured'); $('src-model').setAttribute('aria-pressed', 'true'); renderChecks(); drawChart(); out.innerHTML = '<p class="note">No measured rep loaded.</p>'; });
  out.append(clr);
}
function loadFile(f) {
  const rd = new FileReader();
  rd.onload = () => { try { showMeasured(analyse(parseTable(String(rd.result)), f.name)); } catch (err) { $('meas-out').innerHTML = ''; const p = document.createElement('p'); p.className = 'note'; p.textContent = `Could not read ${f.name}. ${err.message}`; $('meas-out').append(p); } };
  rd.readAsText(f);
}
$('file').addEventListener('change', e => { if (e.target.files[0]) loadFile(e.target.files[0]); });
const drop = $('drop');
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });
// ---------- timeline height follows its controls so the graph keeps its room ----------
const tlTop = document.querySelector('.tl-top'), tlBot = document.querySelector('.tl-bot');
function fitTimeline() {
  const chartMin = phone.matches ? 112 : Math.max(138, leg.scrollHeight), legH = phone.matches ? leg.offsetHeight + 6 : 0;
  const h = Math.round(tlTop.offsetHeight + chartMin + legH + tlBot.offsetHeight + 12 + 17 + 12);
  if (fitTimeline.h !== h) { fitTimeline.h = h; document.documentElement.style.setProperty('--tl-h', h + 'px'); }
}
new ResizeObserver(fitTimeline).observe(tlTop); new ResizeObserver(fitTimeline).observe(tlBot); new ResizeObserver(fitTimeline).observe(leg); fitTimeline();
// ---------- framing: keep the lifter in the space the panels leave open ----------
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; if (w !== resize.w || h !== resize.h) { renderer.setSize(w, h, false); resize.w = w; resize.h = h; } camera.aspect = w/h;
  const sr = stage.getBoundingClientRect(), cr = card.getBoundingClientRect(), fr = formEl.getBoundingClientRect(), kr = tlEl.getBoundingClientRect();
  let L = 0, T = 0, Rr = w;
  if (phone.matches) { const top = Math.round(cr.bottom - sr.top + 8); if (formEl._top !== top) { formEl.style.top = top + 'px'; formEl._top = top; formEl.style.maxHeight = Math.max(120, kr.top - cr.bottom - 16) + 'px'; } }
  else if (formEl._top !== undefined) { formEl.style.top = ''; formEl.style.maxHeight = ''; formEl._top = undefined; }
  if (cr.width > .6*w) T = Math.min(.45*h, Math.max(cr.bottom, formEl.classList.contains('collapsed') ? fr.bottom : 0) - sr.top + 6); else L = Math.min(.4*w, cr.right - sr.left + 6);
  if (!formEl.classList.contains('collapsed') && fr.width < .5*w && fr.left - sr.left > L + .25*w && fr.top - sr.top < .5*h) Rr = fr.left - sr.left - 6;
  const B = Math.max(T + .3*h, Math.min(h, kr.top - sr.top - 6));
  const wf = Rr - L, hf = B - T, tf = Math.max(1.05/3.9, 1.0/(3.9*wf/hf));
  camera.fov = 2*Math.atan(tf*h/hf)*180/Math.PI;
  camera.setViewOffset(w, h, -((L + Rr)/2 - w/2), -((T + B)/2 - h/2), w, h);
}
const ro = new ResizeObserver(resize); for (const e of [stage, card, formEl, tlEl]) ro.observe(e); resize();
// ---------- readouts ----------
const setDD = (id, v, unit, dp, extra) => { const t = fmt(v, dp); const n = $(id); const s = `${t}<small>${unit}</small>${extra ? `<em>${extra}</em>` : ''}`; if (n._s !== s) { n.innerHTML = s; n._s = s; } };
function readouts(st) {
  const s = st.s;
  setDD('r-knee', dAt(s, 'knee'), '°'); setDD('r-hip', dAt(s, 'hip'), '°'); setDD('r-ankle', dAt(s, 'ankle'), '°'); setDD('r-lean', dAt(s, 'lean'), '°'); setDD('r-lumbar', dAt(s, 'lumbar'), '°');
  const dep = dAt(s, 'depth'); const ds = `${fmt(Math.abs(dep), 1)}<small>cm ${dep < 0 ? 'below' : 'above'}</small>`; if ($('r-depth')._s !== ds) { $('r-depth').innerHTML = ds; $('r-depth')._s = ds; }
  const mm = k => dAt(s, k)*st.f;
  setDD('r-mhip', mm('Mhip'), '', 0, `(${fmt(mm('Mhip')/BW, 2)})`); setDD('r-mknee', mm('Mknee'), '', 0, `(${fmt(mm('Mknee')/BW, 2)})`);
  setDD('r-mank', mm('Mank'), '', 0, `(${fmt(mm('Mank')/BW, 2)})`); setDD('r-mlum', mm('Mlum'), '', 0, `(${fmt(mm('Mlum')/BW, 2)})`);
  setDD('r-vel', st.v, 'm/s', 2); setDD('r-grf', st.f, '× wt', 2); setDD('r-cop', dAt(s, 'cop'), '% foot');
  const bm = dAt(s, 'bar'); const bt = Math.abs(bm) < 3 ? 'The bar is directly over midfoot.' : `The bar is ${fmt(Math.abs(bm), 0)} mm ${bm >= 0 ? 'in front of' : 'behind'} midfoot.`; if ($('r-bar').textContent !== bt) $('r-bar').textContent = bt;
  const inStick = st.ph === 3 && STICK[0] !== null && st.t >= STICK[0] && st.t <= STICK[1];
  const pn = PHN[st.ph] + (inStick ? ' · sticking region' : ''), md = inStick ? 'Bar speed dips as knee leverage worsens and the stretch rebound fades. Keep hips and chest rising together.' : PHMODE[st.ph];
  if ($('phase').textContent !== pn) { $('phase').textContent = pn; $('mode').textContent = md; $('dot').style.background = st.ph === 1 ? 'var(--signal)' : st.ph === 3 ? 'var(--accent)' : st.ph === 2 ? 'var(--ink)' : 'var(--muted)'; }
  $('clock').textContent = `${st.t.toFixed(2)} s`;
}
// ---------- main loop ----------
let needColor = true, lastS = -1, lastActKey = '';
const _v = new THREE.Vector3();
status.hidden = true; status.textContent = '';
setTab('angles');
function tick(now) {
  const dt = Math.min(.05, (now - last)/1000); last = now;
  if (playing) { tNow += dt*speed; if (tNow > TT) tNow -= TT; }
  const st = repAt(tNow); cur = st; const d = st.s, f = d*(NS - 1), i0 = Math.min(NS - 2, Math.floor(f)), t = f - i0;
  if (d !== lastS) {
    frameAt(i0, i0 + 1, t);
    for (const mv of movers) { mv.obj.matrix.copy(mv.frame[0] === '@' ? staticM[mv.frame] : curM[mv.frame]); mv.obj.matrixWorldNeedsUpdate = true; }
    bar.matrix.copy(curM.thorax); bar.matrixWorldNeedsUpdate = true;
    curvesAt(i0, i0 + 1, t); updateCurveSet(); updateLBS();
    const a = RO[i0], b = RO[i0 + 1]; marker.position.set(a.bx[0] + (b.bx[0] - a.bx[0])*t, a.bx[1] + (b.bx[1] - a.bx[1])*t, ZT);
    const heelX = META.heel[0], tipX = META.tip[0]; copDot.position.x = heelX + dAt(d, 'cop')/100*(tipX - heelX);
    lastS = d; needColor = needColor || heat;
  }
  const ak = d.toFixed(4) + (st.asc ? 'a' : 'd');
  if (ak !== lastActKey) { actAt(d, st.asc ? 'asc' : 'desc'); lastActKey = ak; if (heat) needColor = true; if (pickedMuscle >= 0 && tip.style.opacity === '1') tip.innerHTML = tipHtml(pickedMuscle, tip.dataset.side, st); }
  if (needColor) { recolor(); needColor = false; }
  readouts(st); updateChart(tNow);
  if (!userTgt) tgt.y += ((0.95 - 0.24*d) - tgt.y)*(reduce ? 1 : .08);
  placeCam(); doPick();
  _v.subVectors(camera.position, tgt).normalize(); const along = Math.abs(_v.z); const po = along > .75 ? Math.max(.12, 1 - (along - .75)*3.6) : 1;
  for (const p of plates) { p.material.opacity = po; p.material.depthWrite = po > .9; }
  MAT.plate.transparent = po < .99; MAT.hub.transparent = po < .99;
  const tv = Math.min(1, Math.max(0, (along - .3)/.35)); for (const m of traceMats) m.opacity = tv; copDot.material.opacity = Math.max(tv, .5); trace.visible = pathOn;
  renderer.render(scene, camera); requestAnimationFrame(tick);
}
window.__squat = { set(o) {
  if ('depth' in o) { setPlay(false); tNow = timeOfDepth(o.depth); }
  if ('time' in o) { setPlay(false); tNow = o.time; }
  if (o.view) { const [th, ph, r] = VIEWS[o.view]; goal.th = th; goal.ph = ph; goal.r = r; }
  if (o.cam) Object.assign(goal, o.cam);
  if (o.tgt) { tgt.set(o.tgt[0], o.tgt[1], o.tgt[2]); userTgt = true; }
  if ('heat' in o && o.heat !== heat) $('t-heat').click();
  if ('skel' in o) { skelR.visible = skelL.visible = skelA.visible = o.skel; }
  if ('mus' in o) { musR.visible = musL.visible = musA.visible = o.mus; }
  if (o.tab) setTab(o.tab);
  if ('guide' in o) { guide.hidden = !o.guide; if (o.pane) guide.querySelector(`nav [data-pane="${o.pane}"]`).click(); }
  if ('form' in o) setFormCollapsed(!o.form);
  if (o.measText) showMeasured(analyse(parseTable(o.measText), o.measName || 'test.mot'));
  Object.assign(cam, goal); placeCam(true);
}, tip(n) { return tipHtml(mi(n), 'Right', repAt(tNow)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); } };
placeCam(true); requestAnimationFrame(tick);
})();
</script>
