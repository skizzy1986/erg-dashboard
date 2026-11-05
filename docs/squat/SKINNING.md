# Squat model: runtime posing maths

How the published squat page turns `squat-manifest.json` + `squat-anatomy.bin` into posed geometry. Source of truth: `dist/squat.html` (squat-anatomy v3, sha256 `02e1d13325fd0902be1751b6410bfc54295acc310bd3e88d6f7d1ab2f6021749`), three.js r128. Every code block is copied verbatim from that file's page script (`page/3-core.js` and `page/4-ui.js` in the v3 bundle), with `// …` marking skipped lines.

**Verification.** I re-implemented the formulas below in NumPy from the manifest and blob alone, then compared against the page's own functions running in headless Chromium:
- all 21,394 curve-skinned vertices and all 7,759 trunk-blend vertices at S = 0.3125 match to ≤ 1.2e-7 m;
- every point in `squat-skinning-fixture.json` matches to ≤ 4.9e-7 m.

## 0. Depth sampling and decoding

- NS = 41. For a depth S in [0, 1]: `f = S·(NS−1)`, `i0 = min(NS−2, floor(f))`, `i1 = i0+1`, `t = f − i0`. S = 1 gives i0 = 39, t = 1.
- The same (i0, t) drives everything per depth: body frames, curve points, curve quaternions, `sig` and activation.
- Quantised positions (bones, lb, st, sa) decode as `v = q·s + c` per component. Curve-skinned vertex positions are not stored; they are computed.

```js
const TA = {'<i2': Int16Array, '|u1': Uint8Array, '<u2': Uint16Array, '<u4': Uint32Array, '<f4': Float32Array, '|i1': Int8Array};
const A = name => { const e = man[name]; return new TA[e.t](buf, e.o, e.n); };
const NS = META.S.length;
// …
function deq(q, c, s) { const out = new Float32Array(q.length); for (let i = 0; i < q.length; i += 3) { out[i] = q[i]*s + c[0]; out[i+1] = q[i+1]*s + c[1]; out[i+2] = q[i+2]*s + c[2]; } return out; }
```

Order of work when S changes (`tick` in `page/4-ui.js`):

```js
  const st = repAt(tNow); cur = st; const d = st.s, f = d*(NS - 1), i0 = Math.min(NS - 2, Math.floor(f)), t = f - i0;
  if (d !== lastS) {
    frameAt(i0, i0 + 1, t);
    for (const mv of movers) { mv.obj.matrix.copy(mv.frame[0] === '@' ? staticM[mv.frame] : curM[mv.frame]); mv.obj.matrixWorldNeedsUpdate = true; }
    bar.matrix.copy(curM.thorax); bar.matrixWorldNeedsUpdate = true;
    curvesAt(i0, i0 + 1, t); updateCurveSet(); updateLBS();
```

## 1. Curve-skinned muscles (`cm_*`)

### Formulas

Curve state at depth (i0, t), for each sample j = 0 … n−1 of curve c (`cv_*` laid out `[curve][S][point]`):

- `P_j = lerp(cv_pos[c][i0][j], cv_pos[c][i1][j], t) · 5e-5`, then `P_j.y += 0.8` (metres, world space)
- `Q_j = normalize(lerp(cv_quat[c][i0][j], cv_quat[c][i1][j], t))`. This is a component-wise lerp of the raw int16 values, then normalised. The page never divides by 32767; normalising cancels the scale.
- `σ = lerp(sig[i0], sig[i1], t)`

One binding (curve c, parameter s, local offset l):

- `u = s · nseg / 4000`, `j = clamp(floor(u), 0, n−2)`, `φ = u − j`
- `p = lerp(P_j, P_j+1, φ)`
- `q = normalize(lerp(Q_j, Q_j+1, φ))`, quaternion xyzw (nlerp, no hemisphere check)
- `v = (l.x·LQ, l.y·LQ·σ, l.z·LQ·σ)`, with LQ = 2e-5 m
- `x_bind = p + R(q)·v`

Vertex:

- `w = cm_w / 255`
- if `w < 0.999`: `x = w·x_bind(c1, s1, l1) + (1−w)·x_bind(c2, s2, l2)`
- otherwise: `x = x_bind(c1, s1, l1)`

The result is world space. The right-side mesh has an identity matrix under identity groups.

### Verbatim JS

```js
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
```

### Answers

- **Units of `cm_s1`/`cm_s2`:**
  - The range is 0 to 4000·K per curve; the maximum in the data is K·4000, up to 32,000 for K = 8.
  - It is a curve parameter, not arclength: s/4000 is the spline-span index plus a fraction.
  - `u = s·nseg/4000` is the fractional index into the `n = K·nseg + 1` samples. All 54 curves satisfy that n, and nseg is 6 or 8.
  - The page never reads K; K enters only through n and the range of s.
  - The ARCHITECTURE.md text "0–4000" is wrong.
- **Blend weight:**
  - `cm_w/255` is the weight on curve 1 (`cm_c1`); curve 2 gets `1 − w`.
  - `w ≥ 0.999` (that is, 255) skips curve 2 entirely. Of 21,394 vertices, 2,259 have w < 255, and every one of those has c1 ≠ c2.
  - Another 1,295 vertices have c1 ≠ c2 with w = 255, and their curve 2 is ignored. Vertex 1000 is one.
  - Since w ranges over 128–255, curve 1 always carries at least half the weight.
- **Offset and sig:**
  - The offset is built in the curve's local frame and scaled before rotation.
  - `sig` scales local y and z (the cross-section) only. Local x, along the tangent, is not scaled.
  - Then the rotation is applied and the result is added to the curve point.
- **Quaternion convention:**
  - Order is xyzw (THREE order). `evalBind` applies `v' = v + w·t + q⃗×t` with `t = 2·q⃗×v`, which is a standard rotation of v by q.
  - Local +x is the curve tangent: the mean |dot(R(q)·x̂, dP/dj)| is 0.999 across all curves at S = 0, 0.5 and 1. y and z span the cross-section.
  - The page normalises after every lerp. Decoded int16/32767 norms are 1 ± 3e-5 anyway.
- **Hemisphere:**
  - Every consecutive pair has a positive dot product: minimum 0.15 between neighbouring points along a curve, 0.74 between neighbouring depth samples. So nlerp without sign flipping is safe.
  - It is also what the page does. Don't substitute slerp here: where neighbouring frames differ a lot, it gives different points.
- **Depth between samples:** the curves are interpolated (positions lerp, quaternions nlerp, `sig` lerp) and the vertices re-evaluated from them. Posed positions are never interpolated.
- **Normals:** `BufferGeometry.computeVertexNormals()` (three's own) runs on the cm geometry every time S changes, at the end of `updateCurveSet`. Trunk-blend normals are recomputed the same way. Bone and st/sa normals are computed once at load.

**Worked example** (fixture `trace_cm_vertex_0`, S = 0.5). Vertex 0 of Gluteus maximus has c1 = 0, c2 = 1 and w = 191, so the weight on curve 1 is 0.749020.

| Step | Curve 1 | Curve 2 |
|---|---|---|
| s | 7794 | 6885 |
| u, j, φ | 15.588, 15, 0.588 | 13.77, 13, 0.77 |
| p | [-0.228576, 0.717706, 0.11883] | [-0.23075, 0.720547, 0.116017] |
| q (xyzw) | [-0.064051, 0.069982, 0.435544, -0.895155] | [0.040031, 0.071728, 0.443968, -0.89227] |
| σ | 0.9055 | 0.8904 |
| v (curve frame, m) | [0.0004, 0.009037, 0.029356] | [0, 0.020159, 0.043576] |
| x_bind | [-0.226682, 0.721348, 0.149272] | [-0.218692, 0.738583, 0.158849] |

Blended result: [-0.224677, 0.725674, 0.151676].

## 2. Trunk linear blend (`lb_*`)

**Formula:**
- `k = lb_i0`, `w = lb_w/255`, `v = deq(lb_pos)`
- `x = w·(M_k·v) + (1−w)·(M_k+1·v)`, where `M` are the current frames of `meta.lbs.frames` = [pelvis_rest, L5, L4, L3, L2, L1, thorax]
- The weight is on frame `i0`.
- `k+1` is clamped to the last frame, but the data has k in 0–5, so the clamp never fires.
- It is a linear blend of the two fully transformed positions.
- The set is mirrored, and it has no tendon tint: its `tw` is a zero array.

```js
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
```

`curM[n].elements` is three's column-major Matrix4 storage, hence `e[r], e[4+r], e[8+r], e[12+r]`.

## 3. Body frames (`frames` [41, 11, 7])

- **Convention:** `world = R(q)·v + p`, built with `Matrix4.compose(p, q, (1,1,1))`. The quaternion order is xyzw (`Quaternion.set(x, y, z, w)`).
- **Between samples:** p is lerped and q is slerped with three r128 `Quaternion.slerp`, which takes the shortest path.
- **Use:** the frame is applied to the vertices as stored for the meshes attached to that body. Bones attach by `meta.bones[g].frame`; the trunk-blend set uses the seven trunk frames.

```js
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
// …
    for (const mv of movers) { mv.obj.matrix.copy(mv.frame[0] === '@' ? staticM[mv.frame] : curM[mv.frame]); mv.obj.matrixWorldNeedsUpdate = true; }
    bar.matrix.copy(curM.thorax); bar.matrixWorldNeedsUpdate = true;
```

**What "stored" means differs by body. This contradicts ARCHITECTURE.md's "maps rest-world to world":**
- **Trunk bodies** (pelvis_rest, L5–L1, thorax): vertices are in a shared trunk rest space. At S = 0 all seven frames are the same transform: an 8.19° rotation plus a translation of (−0.101, −0.0425, −0.0006) m. So the rest space is not the S = 0 pose.
- **Leg bodies** (femur_r, patella_r, tibia_r, talus_r): vertices are in body-local frames. The femur origin is the femoral head centre: femur vertex 0 is stored at (−0.008570, −0.442209, 0.034126), 44 cm below the hip. The frame position at S = 0 is the hip joint centre, (−0.0280, 0.8897, 0.0848).

## 4. `meta.static` (calcn_r, toes_r)

- Each entry is a list of four rows, so it is row-major, because `Matrix4.set()` takes row-major arguments.
- Translation is in `r[i][3]` and the last row is `[0, 0, 0, 1]`.
- It is applied to the calcn_r and toes_r bone vertices as stored, which are body-local. It is the same at every depth.
- The bone entries name these frames `'@calcn_r'` and `'@toes_r'`, and the `@` routes them to `staticM` in `tick`.

```js
const staticM = {}; for (const k in META.static) { const r = META.static[k]; staticM['@' + k] = new THREE.Matrix4().set(...r[0], ...r[1], ...r[2], ...r[3]); }
```

## 5. Mirroring

```js
// groups: right side, mirrored left side (world mirror across z = 0), axial
const sideR = new THREE.Group(), sideL = new THREE.Group(), axial = new THREE.Group(); sideL.scale.set(1, 1, -1);
scene.add(sideR, sideL, axial);
const skelR = new THREE.Group(), skelL = new THREE.Group(), skelA = new THREE.Group(), musR = new THREE.Group(), musL = new THREE.Group(), musA = new THREE.Group();
sideR.add(skelR, musR); sideL.add(skelL, musL); axial.add(skelA, musA);
// …
// ---------- bones ----------
for (const g in META.bones) {
  const bm = META.bones[g]; const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(deq(A(`bone_${g}_pos`), bm.c, bm.s), 3));
  geo.setIndex(new THREE.BufferAttribute(A(`bone_${g}_idx`), 1)); geo.setAttribute('pid', new THREE.BufferAttribute(A(`bone_${g}_id`), 1));
  geo.computeVertexNormals();
  if (bm.mirror) { addMesh(geo, MAT.bone, skelR, bm.frame, {kind: 'bone', names: bm.names, side: 'Right'}); addMesh(geo, MAT.bone, skelL, bm.frame, {kind: 'bone', names: bm.names, side: 'Left'}); }
  else addMesh(geo, MAT.bone, skelA, bm.frame, {kind: 'bone', names: bm.names, side: ''});
}
// …
function makeSet(geo, mid, tw, parentR, parentL, frame, mirrored) {
  const n = mid.length; const col = new Float32Array(n*3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('mid', new THREE.BufferAttribute(mid, 1));
  const s = {geo, mid, tw, col, n}; sets.push(s);
  addMesh(geo, MAT.muscle, parentR, frame, {kind: 'muscle', side: mirrored ? 'Right' : ''});
  if (mirrored) addMesh(geo, MAT.muscle, parentL, frame, {kind: 'muscle', side: 'Left'});
  return s;
}
// …
// (c) static thorax-frame sets
for (const [nm, mirrored] of [['st', true], ['sa', false]]) {
  const mm = man[nm + '_meta']; const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(deq(A(nm + '_pos'), mm.c, mm.s), 3)); geo.setIndex(new THREE.BufferAttribute(A(nm + '_idx'), 1)); geo.computeVertexNormals();
  makeSet(geo, A(nm + '_mid'), A(nm + '_tw'), mirrored ? musR : musA, musL, 'thorax', mirrored);
}
```

- **Mirrored left copies:** bones with `mirror: true` (femur_r, tibia_r, patella_r, talus_r, calcn_r, toes_r, thoraxR, pelvisR), plus the `cm`, `lb` and `st` sets.
- **Not mirrored:** bones `pelvis`, `L1`–`L5`, `thorax` (axial); the `sa` set; the barbell; the bar-path and centre-of-pressure overlays.
- **Plane:** world z = 0. `sideL.scale = (1, 1, −1)` at the origin. `meta.zc` (0.00055 m) is not read anywhere in the page.
- **Shared geometry:** the left mesh shares the right mesh's geometry, so posing and colours are identical on both sides at every depth.
- **Winding:** three r128 sees the negative determinant and flips the front-face winding itself. If you mirror by duplicating vertex data instead, reverse the triangle winding.

## 6. `st_*` and `sa_*`

- The vertex data is fixed: decoded once, with normals computed once.
- Each mesh is a "mover" with frame `'thorax'`, so `mesh.matrix = curM.thorax` every time S changes. It follows the thorax frame rigidly at every depth.
- "Posed once" describes the pipeline, which posed the vertices once in thorax rest space. It does not mean one S.
- The bar uses the same frame: bar centre (world) = `curM.thorax · meta.bar.c`.

```js
// ---------- barbell (rest-world thorax frame) ----------
const bar = new THREE.Group(); bar.matrixAutoUpdate = false; scene.add(bar);
const barInner = new THREE.Group(); barInner.position.set(...META.bar.c); bar.add(barInner);
```

## 7. Colour

**Per muscle k:**
- `TENDON` if `muscles[k].tendon`;
- otherwise `ramp(activation)` when the activation map is on;
- otherwise `baseCol[k]`.

**Per vertex:** `col = c + (TENDON − c) · (tw/255) · (heatmap ? 0.75 : 0.9)`.

**Activation:** a linear interpolation of `act[p][i0..i1]/255`, with p = 0 lowering and p = 1 drive.

```js
// ---------- muscles ----------
const MUS = META.muscles; const NM = MUS.length;
const baseCol = MUS.map((m, i) => new THREE.Color().setHSL(0.995 + ((i*37) % 11 - 5)*0.0035, 0.58 + ((i*13) % 5)*0.025, 0.36 + ((i*7) % 5)*0.018));
const TENDON = new THREE.Color(0xd5dbe0);
// …
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
```

**If you are not on three r128.** r128 does not colour-manage. `THREE.Color` values from hex or HSL are used as-is, and the renderer applies sRGB output encoding:

```js
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputEncoding = THREE.sRGBEncoding;
// …
scene.add(new THREE.HemisphereLight(0xf2f6ff, 0x3b3532, 0.62));
const key = new THREE.DirectionalLight(0xffffff, 0.92); key.position.set(2.2, 4.0, 2.6); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, {left: -1.4, right: 1.4, top: 2.2, bottom: -0.5, near: 0.5, far: 10});
key.shadow.bias = -0.0005; key.shadow.normalBias = 0.015; key.target.position.set(0, 0.8, 0); scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xc8dcff, 0.5); rim.position.set(-2.6, 2.4, -2.8); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffe7d2, 0.28); fill.position.set(-1.0, 1.2, 3.0); scene.add(fill);
const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({color: c, roughness: .6, metalness: 0}, o || {}));
```

From three r152, `ColorManagement` is on by default, so the same hex and HSL inputs are converted from sRGB to linear and render darker. To match the page, set `THREE.ColorManagement.enabled = false` before creating colours, and use `renderer.outputColorSpace = SRGBColorSpace`.

Light units also changed in r155, when physically correct lighting became the default. Check the three.js migration notes for that release; the usual fix is to scale hemisphere and directional intensities by π.

## 8. Semantics

`meta.muscles[k].mode`:

| Value | Count | Meaning |
|---|---|---|
| `1` | 14 | Curve-skinned muscle whose musculotendon length grows with depth (more than +4% from standing to S = 0.9). Eccentric while lowering, concentric while driving. Examples: gluteus maximus, vasti, adductor magnus, hamstrings, soleus. |
| `-1` | 13 | Length falls with depth (more than −4%). Shortening on the way down, lengthening on the way up. Examples: iliacus, psoas, TFL, sartorius, gastrocnemius. |
| `0` | 8 | Near-isometric (within ±4%). Examples: rectus femoris, adductor longus, biceps femoris short head. |
| `"stab"` | 8 | Curve-skinned but length not tracked (path too short or unreliable): gemelli, obturators, quadratus femoris, pectineus, popliteus, Achilles tendon. These have no `len` array. |
| `"brace"` | 13 | `lb` and `sa` sets (abdominal wall, back extensors, QL, latissimus, intercostals). Isometric bracing. |
| `"hold"` | 62 | `st` set (neck, shoulder girdle, arm, forearm, hand). Isometric holding of the bar and the upper-back shelf. |

How the page turns `mode` into the tooltip label (`page/4-ui.js`):

```js
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
```

`meta.pd` holds 41 per-depth values from the timed rep:

| Field | Meaning |
|---|---|
| `fd` | Vertical ground force ÷ (lifter + bar weight) while lowering |
| `fa` | The same while driving |
| `vd` | Bar vertical velocity while lowering (m/s, negative) |
| `va` | Bar vertical velocity while driving (positive) |

- At S = 1 both force arrays hold the reversal value (1.177) and both velocities are 0.
- The page does not read `pd` for rendering or readouts. It reads `meta.rep` at the current time.
- The drive activation table was built from a running maximum of `fa` up to the end of the sticking region, so effort is held there. `act[1]` therefore cannot be rebuilt from `pd.fa` alone.

## 9. Where this contradicts ARCHITECTURE.md

1. **`cm_s1`/`cm_s2` "arclength 0–4000":** both parts are wrong. The range is 0 to 4000·K, and the value is a span parameter (4000 per span), not arclength.
2. **"Frames map rest-world to world":** true only for the seven trunk bodies. The leg bodies, and the calcn/toes static matrices, map body-local coordinates.
3. **LBS "weight between frames k and k+1":** `lb_w/255` is specifically the weight on frame `k` (`lb_i0`).
4. **Mirror plane:** z = 0, not `meta.zc`.
5. **`cv_quat` "int16/32767":** the page never divides. It normalises the lerped raw values, which is equivalent.
6. **Gap:** ARCHITECTURE.md does not say that `sig` scales only local y and z, or that local x is the tangent.
7. **Byte sizes:** the manifest embedded in the published page is 100,785 bytes; yours is 99,904. The blob matches (3,450,003 bytes decompressed). A re-serialisation (for example `JSON.stringify` dropping trailing `.0` on Python floats) would explain the difference without changing any value. Compare parsed objects, not bytes.

## 10. Porting checklist (things that fail silently)

- Use the exact (i0, t) rule. S = 1 means (39, 40, t = 1).
- Curve quaternions: nlerp both across depth and along the curve. Body frames: slerp.
- Clamp `j` to [0, n−2]. At the curve end, j = n−2 and φ = 1.
- Scale only local y and z by `sig`, before rotating.
- Skip curve 2 when `w ≥ 0.999`.
- The LBS weight goes on `lb_i0`.
- `Matrix4.elements` is column-major.
- Recompute normals after posing. On the mirrored side, keep the winding correct.
- The page writes positions into Float32Arrays, so expect up to about 5e-7 m difference from double-precision maths.
- Off r128: colour management and light units (section 7).

## 11. Fixture

`squat-skinning-fixture.json` holds world positions after posing at S = 0, 0.5 and 1, plus S = 0.3125.
- **Why the extra depth:** the first three land exactly on stored samples, so 0.3125 (t = 0.5) is added to test interpolation.
- **Vertices:** cm 0, 1000, 10000 and 21393; the mirrored left copy of cm 1000; lb 0 and 7758; femur_r vertex 0.
- **Also included:** the femur_r frame matrix, every input (c1, c2, w, s1, s2, l1, l2, i0, lb_w, rest and stored positions), and a step-by-step trace of cm vertex 0 at S = 0.5 and 0.3125.
- **The two cases you asked for:** cm vertex 0 has c1 ≠ c2 and w = 191 < 255. lb vertex 0 has w = 0, so it sits fully on frame i0+1 (thorax), which tests the weight direction once the trunk bends.
- **How it was produced:** values come from the page's own `frameAt`, `curvesAt`, `evalBind`, `updateCurveSet` and `updateLBS`, run in headless Chromium through a read-only hook that exposes them. They are rounded to 6 dp. Use a tolerance of 1e-5 m.
