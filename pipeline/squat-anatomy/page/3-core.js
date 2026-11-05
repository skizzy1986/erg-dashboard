<script>
(async function(){
'use strict';
const $ = id => document.getElementById(id);
const status = $('status');
if (!window.THREE) { status.textContent = 'The 3D library did not load. Check your connection and reload.'; return; }
if (typeof DecompressionStream === 'undefined') { status.textContent = 'This browser cannot unpack the anatomy data. Update the browser and reload.'; return; }
const man = JSON.parse($('squat-manifest').textContent); const META = man.meta;
// ---------- decode data ----------
let buf;
try {
  const b64 = $('squat-data').textContent.trim(); const bin = atob(b64); const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  buf = await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
} catch (e) { status.textContent = 'The anatomy data could not be unpacked. Reload the page.'; return; }
const TA = {'<i2': Int16Array, '|u1': Uint8Array, '<u2': Uint16Array, '<u4': Uint32Array, '<f4': Float32Array, '|i1': Int8Array};
const A = name => { const e = man[name]; return new TA[e.t](buf, e.o, e.n); };
const NS = META.S.length;
// ---------- renderer / scene ----------
const stage = $('stage'), canvas = $('c');
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true}); }
catch (e) { status.textContent = 'The 3D view needs WebGL, which this browser did not provide.'; return; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
scene.add(new THREE.HemisphereLight(0xf2f6ff, 0x3b3532, 0.62));
const key = new THREE.DirectionalLight(0xffffff, 0.92); key.position.set(2.2, 4.0, 2.6); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, {left: -1.4, right: 1.4, top: 2.2, bottom: -0.5, near: 0.5, far: 10});
key.shadow.bias = -0.0005; key.shadow.normalBias = 0.015; key.target.position.set(0, 0.8, 0); scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xc8dcff, 0.5); rim.position.set(-2.6, 2.4, -2.8); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffe7d2, 0.28); fill.position.set(-1.0, 1.2, 3.0); scene.add(fill);
const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({color: c, roughness: .6, metalness: 0}, o || {}));
const MAT = { bone: std(0xe7dcc4, {roughness: .55}), muscle: std(0xffffff, {vertexColors: true, roughness: .5}),
  steel: std(0xb4bcc4, {metalness: .85, roughness: .28}), plate: std(0x2158b3, {roughness: .7, transparent: true}), hub: std(0xd2d6da, {metalness: .8, roughness: .3, transparent: true}),
  rubber: std(0x2b2c2f, {roughness: .95}), wood: std(0xb98a5b, {roughness: .75}) };
const floorR = new THREE.Mesh(new THREE.BoxGeometry(2.44, .03, 2.44), MAT.rubber); floorR.position.set(0.15, -.016, 0); floorR.receiveShadow = true; scene.add(floorR);
const floorW = new THREE.Mesh(new THREE.BoxGeometry(2.44, .03, 1.22), MAT.wood); floorW.position.set(0.15, -.014, 0); floorW.receiveShadow = true; scene.add(floorW);
// groups: right side, mirrored left side (world mirror across z = 0), axial
const sideR = new THREE.Group(), sideL = new THREE.Group(), axial = new THREE.Group(); sideL.scale.set(1, 1, -1);
scene.add(sideR, sideL, axial);
const skelR = new THREE.Group(), skelL = new THREE.Group(), skelA = new THREE.Group(), musR = new THREE.Group(), musL = new THREE.Group(), musA = new THREE.Group();
sideR.add(skelR, musR); sideL.add(skelL, musL); axial.add(skelA, musA);
// ---------- frames ----------
const FR = A('frames'); const FRN = META.frames; const NF = FRN.length;
const curM = {}; FRN.forEach(n => curM[n] = new THREE.Matrix4());
const _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s1 = new THREE.Vector3(1, 1, 1);
function frameAt(i0, i1, t) {
  for (let j = 0; j < NF; j++) {
    const a = (i0*NF + j)*7, b = (i1*NF + j)*7;
    _p.set(FR[a] + (FR[b]-FR[a])*t, FR[a+1] + (FR[b+1]-FR[a+1])*t, FR[a+2] + (FR[b+2]-FR[a+2])*t);
    _q0.set(FR[a+3], FR[a+4], FR[a+5], FR[a+6]); _q1.set(FR[b+3], FR[b+4], FR[b+5], FR[b+6]); _q0.slerp(_q1, t);
    curM[FRN[j]].compose(_p, _q0, _s1);
  }
}
const staticM = {}; for (const k in META.static) { const r = META.static[k]; staticM['@' + k] = new THREE.Matrix4().set(...r[0], ...r[1], ...r[2], ...r[3]); }
// ---------- geometry helpers ----------
function deq(q, c, s) { const out = new Float32Array(q.length); for (let i = 0; i < q.length; i += 3) { out[i] = q[i]*s + c[0]; out[i+1] = q[i+1]*s + c[1]; out[i+2] = q[i+2]*s + c[2]; } return out; }
const pickables = []; const movers = [];   // movers: {obj, frame}
function addMesh(geo, mat, parent, frame, user) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; m.userData = user;
  parent.add(m); pickables.push(m); if (frame) movers.push({obj: m, frame}); return m;
}
// ---------- bones ----------
for (const g in META.bones) {
  const bm = META.bones[g]; const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(deq(A(`bone_${g}_pos`), bm.c, bm.s), 3));
  geo.setIndex(new THREE.BufferAttribute(A(`bone_${g}_idx`), 1)); geo.setAttribute('pid', new THREE.BufferAttribute(A(`bone_${g}_id`), 1));
  geo.computeVertexNormals();
  if (bm.mirror) { addMesh(geo, MAT.bone, skelR, bm.frame, {kind: 'bone', names: bm.names, side: 'Right'}); addMesh(geo, MAT.bone, skelL, bm.frame, {kind: 'bone', names: bm.names, side: 'Left'}); }
  else addMesh(geo, MAT.bone, skelA, bm.frame, {kind: 'bone', names: bm.names, side: ''});
}
// ---------- muscles ----------
const MUS = META.muscles; const NM = MUS.length;
const baseCol = MUS.map((m, i) => new THREE.Color().setHSL(0.995 + ((i*37) % 11 - 5)*0.0035, 0.58 + ((i*13) % 5)*0.025, 0.36 + ((i*7) % 5)*0.018));
const TENDON = new THREE.Color(0xd5dbe0);
const sets = [];   // {geo, mid, tw, col}
function makeSet(geo, mid, tw, parentR, parentL, frame, mirrored) {
  const n = mid.length; const col = new Float32Array(n*3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('mid', new THREE.BufferAttribute(mid, 1));
  const s = {geo, mid, tw, col, n}; sets.push(s);
  addMesh(geo, MAT.muscle, parentR, frame, {kind: 'muscle', side: mirrored ? 'Right' : ''});
  if (mirrored) addMesh(geo, MAT.muscle, parentL, frame, {kind: 'muscle', side: 'Left'});
  return s;
}
// (a) curve-skinned set (world coordinates, rebuilt each frame)
const CM = {c1: A('cm_c1'), c2: A('cm_c2'), w: A('cm_w'), s1: A('cm_s1'), s2: A('cm_s2'), l1: A('cm_l1'), l2: A('cm_l2')};
const CMN = META.cm_nv; const cmPos = new Float32Array(CMN*3);
const cmGeo = new THREE.BufferGeometry(); cmGeo.setAttribute('position', new THREE.BufferAttribute(cmPos, 3)); cmGeo.setIndex(new THREE.BufferAttribute(A('cm_idx'), 1));
const cmSet = makeSet(cmGeo, A('cm_mid'), A('cm_tw'), musR, musL, null, true);
cmGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.8, 0), 2.5);
const CV = META.curves; const CVP = A('cv_pos'), CVQ = A('cv_quat'); let off = 0;
const curves = CV.map(c => { const o = {n: c.n, K: c.K, nseg: c.nseg, sig: c.sig, off, P: new Float32Array(c.n*3), Q: new Float32Array(c.n*4), s: 1}; off += NS*c.n; return o; });
function curvesAt(i0, i1, t) {
  for (const c of curves) {
    const a = c.off + i0*c.n, b = c.off + i1*c.n;
    for (let j = 0; j < c.n; j++) {
      const pa = (a + j)*3, pb = (b + j)*3;
      c.P[j*3] = (CVP[pa] + (CVP[pb]-CVP[pa])*t)*5e-5; c.P[j*3+1] = (CVP[pa+1] + (CVP[pb+1]-CVP[pa+1])*t)*5e-5 + 0.8; c.P[j*3+2] = (CVP[pa+2] + (CVP[pb+2]-CVP[pa+2])*t)*5e-5;
      const qa = (a + j)*4, qb = (b + j)*4; let x = CVQ[qa] + (CVQ[qb]-CVQ[qa])*t, y = CVQ[qa+1] + (CVQ[qb+1]-CVQ[qa+1])*t, z = CVQ[qa+2] + (CVQ[qb+2]-CVQ[qa+2])*t, w = CVQ[qa+3] + (CVQ[qb+3]-CVQ[qa+3])*t;
      const L = 1/Math.hypot(x, y, z, w); c.Q[j*4] = x*L; c.Q[j*4+1] = y*L; c.Q[j*4+2] = z*L; c.Q[j*4+3] = w*L;
    }
    c.s = c.sig[i0] + (c.sig[i1] - c.sig[i0])*t;
  }
}
const LQ = META.LQ;
function evalBind(c, s, lx, ly, lz, out) {
  const cv = curves[c]; let u = s/4000*cv.nseg; let j = Math.floor(u); if (j > cv.n - 2) j = cv.n - 2; if (j < 0) j = 0; const f = u - j;
  const P = cv.P, Q = cv.Q, a = j*3, b = a + 3, qa = j*4, qb = qa + 4;
  const px = P[a] + (P[b]-P[a])*f, py = P[a+1] + (P[b+1]-P[a+1])*f, pz = P[a+2] + (P[b+2]-P[a+2])*f;
  let qx = Q[qa] + (Q[qb]-Q[qa])*f, qy = Q[qa+1] + (Q[qb+1]-Q[qa+1])*f, qz = Q[qa+2] + (Q[qb+2]-Q[qa+2])*f, qw = Q[qa+3] + (Q[qb+3]-Q[qa+3])*f;
  const L = 1/Math.hypot(qx, qy, qz, qw); qx *= L; qy *= L; qz *= L; qw *= L;
  const vx = lx*LQ, vy = ly*LQ*cv.s, vz = lz*LQ*cv.s;
  const tx = 2*(qy*vz - qz*vy), ty = 2*(qz*vx - qx*vz), tz = 2*(qx*vy - qy*vx);
  out[0] = px + vx + qw*tx + (qy*tz - qz*ty); out[1] = py + vy + qw*ty + (qz*tx - qx*tz); out[2] = pz + vz + qw*tz + (qx*ty - qy*tx);
}
const _o1 = [0, 0, 0], _o2 = [0, 0, 0];
function updateCurveSet() {
  const {c1, c2, w, s1, s2, l1, l2} = CM;
  for (let i = 0; i < CMN; i++) {
    const wt = w[i]/255, i3 = i*3;
    evalBind(c1[i], s1[i], l1[i3], l1[i3+1], l1[i3+2], _o1);
    if (wt < 0.999) { evalBind(c2[i], s2[i], l2[i3], l2[i3+1], l2[i3+2], _o2);
      cmPos[i3] = _o1[0]*wt + _o2[0]*(1-wt); cmPos[i3+1] = _o1[1]*wt + _o2[1]*(1-wt); cmPos[i3+2] = _o1[2]*wt + _o2[2]*(1-wt); }
    else { cmPos[i3] = _o1[0]; cmPos[i3+1] = _o1[1]; cmPos[i3+2] = _o1[2]; }
  }
  cmGeo.attributes.position.needsUpdate = true; cmGeo.computeVertexNormals();
}
// (b) LBS set (trunk and latissimus)
const LBm = META.lbs; const lbRest = deq(A('lb_pos'), LBm.c, LBm.s); const lbI = A('lb_i0'), lbW = A('lb_w'); const lbPos = new Float32Array(lbRest.length);
const lbGeo = new THREE.BufferGeometry(); lbGeo.setAttribute('position', new THREE.BufferAttribute(lbPos, 3)); lbGeo.setIndex(new THREE.BufferAttribute(A('lb_idx'), 1));
const lbSet = makeSet(lbGeo, A('lb_mid'), new Uint8Array(LBm.nv), musR, musL, null, true);
lbGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.8, 0), 2.5);
function updateLBS() {
  const Ms = LBm.frames.map(n => curM[n].elements);
  for (let i = 0; i < LBm.nv; i++) {
    const k = lbI[i], w = lbW[i]/255, e0 = Ms[k], e1 = Ms[Math.min(k + 1, Ms.length - 1)], i3 = i*3;
    const x = lbRest[i3], y = lbRest[i3+1], z = lbRest[i3+2];
    for (let r = 0; r < 3; r++) lbPos[i3+r] = w*(e0[r]*x + e0[4+r]*y + e0[8+r]*z + e0[12+r]) + (1-w)*(e1[r]*x + e1[4+r]*y + e1[8+r]*z + e1[12+r]);
  }
  lbGeo.attributes.position.needsUpdate = true; lbGeo.computeVertexNormals();
}
// (c) static thorax-frame sets
for (const [nm, mirrored] of [['st', true], ['sa', false]]) {
  const mm = man[nm + '_meta']; const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(deq(A(nm + '_pos'), mm.c, mm.s), 3)); geo.setIndex(new THREE.BufferAttribute(A(nm + '_idx'), 1)); geo.computeVertexNormals();
  makeSet(geo, A(nm + '_mid'), A(nm + '_tw'), mirrored ? musR : musA, musL, 'thorax', mirrored);
}
// ---------- barbell (rest-world thorax frame) ----------
const bar = new THREE.Group(); bar.matrixAutoUpdate = false; scene.add(bar);
const barInner = new THREE.Group(); barInner.position.set(...META.bar.c); bar.add(barInner);
function cyl(r, len, mat, z) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 40), mat); m.rotation.x = Math.PI/2; m.position.z = z; m.castShadow = true; barInner.add(m); return m; }
cyl(.0145, 1.31, MAT.steel, 0); const plates = [];
for (const s of [1, -1]) { cyl(.025, .445, MAT.steel, s*.8775); cyl(.039, .03, MAT.steel, s*.67);
  for (const z of [.72, .79]) { plates.push(cyl(.225, .065, MAT.plate, s*z)); plates.push(cyl(.058, .067, MAT.hub, s*z)); }
  cyl(.034, .045, MAT.steel, s*.85); }
// ---------- bar path + midfoot line ----------
const trace = new THREE.Group(); scene.add(trace);
// Bar centre and midfoot both lie in the mid-sagittal plane (z = 0); drawn on top of the body so they line up with it from any side angle.
const RO = META.readout; const ZT = 0, overlay = {depthTest: false, depthWrite: false, transparent: true};
const traceMats = [new THREE.LineBasicMaterial({color: 0xd99a1f, ...overlay}), new THREE.LineDashedMaterial({color: 0x8a979d, dashSize: .03, gapSize: .025, ...overlay}), new THREE.MeshBasicMaterial({color: 0xd99a1f, ...overlay})];
const pathLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(RO.map(r => new THREE.Vector3(r.bx[0], r.bx[1], ZT))), traceMats[0]);
const plumb = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(META.cop[0], 0, ZT), new THREE.Vector3(META.cop[0], 1.75, ZT)]), traceMats[1]);
plumb.computeLineDistances();
const marker = new THREE.Mesh(new THREE.SphereGeometry(.017, 16, 10), traceMats[2]);
const copDot = new THREE.Mesh(new THREE.RingGeometry(.016, .028, 28), new THREE.MeshBasicMaterial({color: 0xd99a1f, side: THREE.DoubleSide, ...overlay}));
copDot.rotation.x = -Math.PI/2; copDot.position.set(META.cop[0], .004, ZT);
for (const o of [pathLine, plumb, marker, copDot]) { o.renderOrder = 10; trace.add(o); }
let pathOn = true;
// ---------- colours / activation ----------
let heat = false, curAct = new Float32Array(NM);
const RAMP = [[0, new THREE.Color(0x3d5a8c)], [.3, new THREE.Color(0x8c3b6b)], [.6, new THREE.Color(0xcf3a2a)], [1, new THREE.Color(0xffd35c)]];
const _c = new THREE.Color();
function ramp(a) { for (let k = 1; k < RAMP.length; k++) if (a <= RAMP[k][0]) { const [a0, c0] = RAMP[k-1], [a1, c1] = RAMP[k]; return _c.copy(c0).lerp(c1, (a - a0)/(a1 - a0)); } return _c.copy(RAMP[3][1]); }
const mCol = MUS.map(() => new THREE.Color());
function recolor() {
  for (let i = 0; i < NM; i++) { if (heat && !MUS[i].tendon) mCol[i].copy(ramp(curAct[i])); else mCol[i].copy(MUS[i].tendon ? TENDON : baseCol[i]); }
  for (const s of sets) {
    for (let v = 0; v < s.n; v++) { const c = mCol[s.mid[v]], t = s.tw[v]/255*(heat ? 0.75 : 0.9), v3 = v*3;
      s.col[v3] = c.r + (TENDON.r - c.r)*t; s.col[v3+1] = c.g + (TENDON.g - c.g)*t; s.col[v3+2] = c.b + (TENDON.b - c.b)*t; }
    s.geo.attributes.color.needsUpdate = true;
  }
}
function actAt(d, phase) {
  const f = d*(NS - 1), i0 = Math.min(NS - 2, Math.floor(f)), t = f - i0, p = phase === 'asc' ? 1 : 0;
  for (let i = 0; i < NM; i++) { const a = MUS[i].act; if (!a) { curAct[i] = 0; continue; } curAct[i] = (a[p][i0] + (a[p][i0+1] - a[p][i0])*t)/255; }
}
// ---------- camera ----------
const VIEWS = {side: [0.0001, 1.45, 3.9], front: [Math.PI/2, 1.38, 4.1], back: [-Math.PI/2, 1.38, 4.1], three: [0.72, 1.30, 3.9]};
const cam = {th: 0.72, ph: 1.30, r: 3.9}, goal = {...cam}, tgt = new THREE.Vector3(0.0, 0.95, 0); let userTgt = false;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function placeCam(snap) { for (const k of ['th', 'ph', 'r']) cam[k] += (goal[k] - cam[k])*(snap || reduce ? 1 : .15);
  camera.position.set(tgt.x + cam.r*Math.sin(cam.ph)*Math.sin(cam.th), tgt.y + cam.r*Math.cos(cam.ph), tgt.z + cam.r*Math.sin(cam.ph)*Math.cos(cam.th)); camera.lookAt(tgt); }
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { const [th, ph, r] = VIEWS[b.dataset.view];
  let d = th - goal.th; d = ((d + Math.PI) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI) - Math.PI; goal.th += d; goal.ph = ph; goal.r = r; }));
const ptrs = new Map(); let pinch0 = 0, down = null, moved = 0;
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY}); down = {x: e.clientX, y: e.clientY}; moved = 0;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); } });
canvas.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) { queuePick(e.clientX, e.clientY, false); return; }
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
  if (ptrs.size === 1) { goal.th -= dx*.008; goal.ph = Math.min(1.62, Math.max(.25, goal.ph - dy*.006)); hideTip(); }
  else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], dd = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) goal.r = Math.min(7, Math.max(1.0, goal.r*pinch0/dd)); pinch0 = dd; } });
const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; if (down && moved < 6 && ptrs.size === 0) queuePick(e.clientX, e.clientY, true); down = null; };
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
canvas.addEventListener('wheel', e => { e.preventDefault(); goal.r = Math.min(7, Math.max(1.0, goal.r*(1 + e.deltaY*.0012))); }, {passive: false});
canvas.addEventListener('keydown', e => { const m = {ArrowLeft: [-.15, 0], ArrowRight: [.15, 0], ArrowUp: [0, -.1], ArrowDown: [0, .1]}[e.key];
  if (m) { goal.th += m[0]; goal.ph = Math.min(1.62, Math.max(.25, goal.ph + m[1])); e.preventDefault(); }
  if (e.key === ' ') { setPlay(!playing); e.preventDefault(); } });