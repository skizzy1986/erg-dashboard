import {
  BufferAttribute,
  BufferGeometry,
  ColorManagement,
  CylinderGeometry,
  DirectionalLight,
  DynamicDrawUsage,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  NoToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  Sphere,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { viewArray } from '../utils/arrays.js';
import { dequantise } from '../utils/dequantise.js';
import { createPoser } from '../utils/poseModel.js';
import {
  heatColours,
  muscleColours,
  writeVertexColours,
} from '../utils/sceneColours.js';
import {
  clampDistance,
  framingDistance,
  fromOffset,
  orbit as orbitBy,
  PRESET_AZIMUTH,
  toOffset,
  tweenSpherical,
  zoom as zoomBy,
} from '../utils/cameraMath.js';

// The model's colours were authored for three r128, which did not
// colour-manage: hex and HSL inputs went to the shader as-is. r152+ converts
// them sRGB → linear and the model renders darker (SKINNING.md §7). This
// module is only reached through loadScene.js, so the switch affects the
// lazily loaded 3D chunk and nothing else.
ColorManagement.enabled = false;

// Lights were tuned in r128 units; r155 made physically correct lighting the
// default, which divides the effective intensity by π.
const LIGHT_UNIT = Math.PI;

const sameWeights = (a, b) => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

// The e2e probe (frame counter, mirror check, pixel snapshot) exists only in
// dev or behind ?anatomy-debug, so production carries one query-string read
// and no globals unless someone asks.
const debugEnabled = () => {
  try {
    return (
      import.meta.env.DEV ||
      new URLSearchParams(window.location.search).has('anatomy-debug')
    );
  } catch {
    // No location (a worker or a test shim): no probe.
    return false;
  }
};

/**
 * Builds the 3D view into `container` and returns its controller. The scene
 * owns its canvas — created here, removed on dispose — so a StrictMode
 * double mount gets two independent canvases, never two renderers fighting
 * over one.
 *
 * Renders on demand only: a frame is requested by a setter, a resize, the
 * controls or a running camera tween, and none while the page is hidden.
 *
 * `initialPose` ({radius, polar, azimuth}, e.g. from a shared link) is placed
 * instead of the home view before the first frame, so a linked view never
 * flashes the default first. `onUserCamera` fires on every camera move the
 * user makes (a gesture, Reset, a preset, orbit, zoom), never on setPose.
 */
export function createAnatomyScene({
  container,
  manifest,
  buffer,
  palette,
  style,
  reducedMotion = false,
  coarsePointer = false,
  onFirstFrame,
  onContextLost,
  onContextRestored,
  initialPose = null,
  onUserCamera,
}) {
  const meta = manifest.meta;
  const A = (name) => viewArray(manifest, buffer, name);
  const poser = createPoser(manifest, buffer);

  // Every resource registers its own release as it is created, so dispose()
  // and a build that throws halfway run the same teardown, newest first:
  // listeners, controls, geometries and materials, lights, the renderer and
  // its context, and last the canvas. A failed build used to leave its
  // canvas (and GL context) in the stage, one more for every Retry.
  const cleanups = [];
  const teardown = () => {
    while (cleanups.length) {
      const release = cleanups.pop();
      try {
        release();
      } catch {
        // Keep going: one release that throws must not leak all the rest.
      }
    }
  };
  let disposed = false;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('tabindex', '-1');
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
  });
  container.appendChild(canvas);
  cleanups.push(() => canvas.remove());

  try {
    const renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    cleanups.push(() => {
      renderer.dispose();
      renderer.forceContextLoss();
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NoToneMapping;
    // Transparent: the stage's CSS gradient is the background.
    renderer.setClearAlpha(0);
    const shadows = !coarsePointer;
    renderer.shadowMap.enabled = shadows;

    const scene = new Scene();
    const cam = style.camera;
    const camera = new PerspectiveCamera(cam.fov, 1, cam.near, cam.far);
    const target = new Vector3(...cam.target);

    // ── lights ──────────────────────────────────────────────────────────
    const L = style.lights;
    const hemi = new HemisphereLight();
    const key = new DirectionalLight();
    const rim = new DirectionalLight();
    const fill = new DirectionalLight();
    key.position.set(...L.key.position);
    key.target.position.set(...L.key.target);
    rim.position.set(...L.rim.position);
    fill.position.set(...L.fill.position);
    key.castShadow = shadows;
    if (shadows) {
      key.shadow.mapSize.set(style.shadowMapSize, style.shadowMapSize);
      Object.assign(key.shadow.camera, L.key.shadowCamera);
      key.shadow.camera.updateProjectionMatrix();
      key.shadow.bias = L.key.shadowBias;
      key.shadow.normalBias = L.key.shadowNormalBias;
    }
    scene.add(hemi, key, key.target, rim, fill);
    // DirectionalLight.dispose() also releases its shadow map.
    cleanups.push(() => [hemi, key, rim, fill].forEach((l) => l.dispose()));

    // ── materials ──────────────────────────────────────────────────────
    const geometries = [];
    const materials = [];
    cleanups.push(() => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    });
    const muscleMat = new MeshStandardMaterial({
      vertexColors: true,
      ...style.material,
    });
    const boneMat = new MeshStandardMaterial({ ...style.material });
    const barMat = new MeshStandardMaterial({
      metalness: style.bar.metalness,
      roughness: style.bar.roughness,
    });
    const groundMat = new ShadowMaterial({ transparent: true });
    materials.push(muscleMat, boneMat, barMat, groundMat);

    // ── groups: right, mirrored left (z = 0 plane), axial ────────────
    const sideR = new Group();
    const sideL = new Group();
    const axial = new Group();
    // A negative determinant: three flips the front-face winding itself, so
    // the shared geometry stays correct on the mirrored side.
    sideL.scale.set(1, 1, -1);
    const layers = {
      muscles: [new Group(), new Group(), new Group()],
      skeleton: [new Group(), new Group(), new Group()],
      // The seam for a future clothed human, rigged to poser.frames.
      body: [new Group()],
    };
    [sideR, sideL, axial].forEach((g, i) => {
      g.add(layers.skeleton[i], layers.muscles[i]);
    });
    const equipment = new Group();
    scene.add(sideR, sideL, axial, equipment, layers.body[0]);

    const movers = [];
    const addMesh = (geo, mat, parent, frame) => {
      const mesh = new Mesh(geo, mat);
      mesh.castShadow = shadows;
      if (frame) {
        mesh.matrixAutoUpdate = false;
        movers.push({ mesh, m: poser.matrixFor(frame) });
      }
      parent.add(mesh);
      return mesh;
    };
    const indexed = (positions, idx) => {
      const geo = new BufferGeometry();
      geo.setAttribute('position', new BufferAttribute(positions, 3));
      geo.setIndex(new BufferAttribute(idx, 1));
      geometries.push(geo);
      return geo;
    };

    // ── bones (rigid, static vertices) ──────────────────────────────
    for (const [g, bm] of Object.entries(meta.bones)) {
      const geo = indexed(
        dequantise(A(`bone_${g}_pos`), bm.c, bm.s),
        A(`bone_${g}_idx`)
      );
      geo.computeVertexNormals();
      if (bm.mirror) {
        addMesh(geo, boneMat, layers.skeleton[0], bm.frame);
        addMesh(geo, boneMat, layers.skeleton[1], bm.frame);
      } else {
        addMesh(geo, boneMat, layers.skeleton[2], bm.frame);
      }
    }

    // ── muscle sets ────────────────────────────────────────────────
    const colourSets = [];
    const M = style.model;
    const fixedBounds = new Sphere(new Vector3(...M.centre), M.boundsRadius);
    const makeSet = (geo, mid, tw, mirrored, frame) => {
      const col = new Float32Array(mid.length * 3);
      geo.setAttribute('color', new BufferAttribute(col, 3));
      colourSets.push({ geo, mid, tw, col });
      addMesh(
        geo,
        muscleMat,
        mirrored ? layers.muscles[0] : layers.muscles[2],
        frame
      );
      if (mirrored) addMesh(geo, muscleMat, layers.muscles[1], frame);
    };
    const dynamic = (geo) => {
      geo.attributes.position.setUsage(DynamicDrawUsage);
      // Posed every frame: a fixed sphere instead of a recompute per pose.
      geo.boundingSphere = fixedBounds;
      return geo;
    };
    const cmGeo = dynamic(indexed(poser.cmPos, A('cm_idx')));
    makeSet(cmGeo, A('cm_mid'), A('cm_tw'), true, null);
    const lbGeo = dynamic(indexed(poser.lbPos, A('lb_idx')));
    makeSet(lbGeo, A('lb_mid'), new Uint8Array(meta.lbs.nv), true, null);
    for (const [nm, mirrored] of [
      ['st', true],
      ['sa', false],
    ]) {
      const mm = manifest[`${nm}_meta`];
      const geo = indexed(
        dequantise(A(`${nm}_pos`), mm.c, mm.s),
        A(`${nm}_idx`)
      );
      geo.computeVertexNormals();
      makeSet(geo, A(`${nm}_mid`), A(`${nm}_tw`), mirrored, 'thorax');
    }

    // ── barbell, on the thorax frame (meta.bar.c in thorax rest space) ──
    const B = style.bar;
    const bar = new Group();
    bar.matrixAutoUpdate = false;
    movers.push({ mesh: bar, m: poser.matrixFor('thorax') });
    const barInner = new Group();
    barInner.position.set(...meta.bar.c);
    bar.add(barInner);
    const cylinder = (r, len) => {
      const g = new CylinderGeometry(r, r, len, B.segments);
      g.rotateX(Math.PI / 2);
      geometries.push(g);
      return g;
    };
    const shaft = new Mesh(cylinder(meta.bar.r ?? B.radius, B.length), barMat);
    barInner.add(shaft);
    const plateGeo = cylinder(B.plateRadius, B.plateWidth);
    const sleeveGeo = cylinder(B.sleeveRadius, B.sleeveLength);
    for (const side of [-1, 1]) {
      const plate = new Mesh(plateGeo, barMat);
      plate.position.z = side * B.plateOffset;
      const sleeve = new Mesh(sleeveGeo, barMat);
      sleeve.position.z = side * (B.length / 2 - B.sleeveLength / 2);
      barInner.add(plate, sleeve);
    }
    barInner.traverse((o) => {
      o.castShadow = shadows;
    });
    equipment.add(bar);

    // ── ground ─────────────────────────────────────────────────────
    const groundGeo = new PlaneGeometry(style.groundSize, style.groundSize);
    geometries.push(groundGeo);
    const ground = new Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = shadows;
    ground.visible = shadows;
    scene.add(ground);

    // ── appearance ─────────────────────────────────────────────────
    // The palette and style the scene is currently painted with, and the
    // activation weights it is painted under (null = anatomy colours). Held
    // here so the vertex-colour write is callable on its own: a heatmap change
    // must not redo the light setup, and a theme change must not lose the
    // heatmap.
    let pal = palette;
    let st = style;
    let heat = null;

    function applyLights(p, style0) {
      const lt = style0.lights;
      hemi.color.setRGB(...lt.hemisphere.sky);
      hemi.groundColor.setRGB(...lt.hemisphere.ground);
      hemi.intensity = lt.hemisphere.intensity * LIGHT_UNIT;
      key.color.setRGB(...lt.key.color);
      key.intensity = lt.key.intensity * LIGHT_UNIT;
      rim.color.setRGB(...lt.rim.color);
      rim.intensity = lt.rim.intensity * LIGHT_UNIT;
      fill.color.setRGB(...lt.fill.color);
      fill.intensity = lt.fill.intensity * LIGHT_UNIT;
      boneMat.color.setRGB(...p.bone);
      barMat.color.setRGB(...p.bar);
      groundMat.color.setRGB(...p.shadow);
      groundMat.opacity = style0.shadowOpacity;
    }

    function writeColours() {
      const mc = heat
        ? heatColours(meta.muscles, heat, pal.heat, pal.tendon)
        : muscleColours(meta.muscles, pal, st.jitter);
      const blend = heat ? st.tendonBlendHeat : st.tendonBlend;
      for (const set of colourSets) {
        writeVertexColours(set.col, set.mid, set.tw, mc, pal.tendon, blend);
        set.geo.attributes.color.needsUpdate = true;
      }
    }

    function applyPalette(p, style0) {
      pal = p;
      st = style0;
      applyLights(p, style0);
      writeColours();
    }
    applyPalette(palette, style);

    // ── posing ─────────────────────────────────────────────────────
    let posedS = null;
    let pendingS = 0;
    let pendingHeat = false;
    function applyPose(s) {
      poser.poseAt(s);
      for (const { mesh, m } of movers) {
        mesh.matrix.fromArray(m);
        mesh.matrixWorldNeedsUpdate = true;
      }
      for (const geo of [cmGeo, lbGeo]) {
        geo.attributes.position.needsUpdate = true;
        geo.computeVertexNormals();
      }
      posedS = s;
    }

    // ── camera ────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, canvas);
    cleanups.push(() => controls.dispose());
    controls.target.copy(target);
    controls.enableDamping = !reducedMotion;
    controls.autoRotate = false;
    controls.enablePan = false;
    controls.minDistance = cam.minDistance;
    controls.maxDistance = cam.maxDistance;
    controls.minPolarAngle = cam.minPolar;
    controls.maxPolarAngle = cam.maxPolar;

    let aspect = 1;
    const homeView = () => ({
      radius: clampDistance(
        Math.max(
          cam.defaultDistance,
          framingDistance(M.radius, cam.fov, aspect)
        ),
        cam.minDistance,
        cam.maxDistance
      ),
      polar: cam.defaultPolar,
      azimuth: cam.defaultAzimuth,
    });
    const currentView = () =>
      fromOffset(camera.position.clone().sub(controls.target).toArray());
    const place = (sph) => {
      const o = toOffset(sph);
      camera.position.set(
        controls.target.x + o[0],
        controls.target.y + o[1],
        controls.target.z + o[2]
      );
      camera.lookAt(controls.target);
    };
    const cleanView = (p) => ({
      ...orbitBy(p, 0, 0, cam.minPolar, cam.maxPolar),
      radius: clampDistance(p.radius, cam.minDistance, cam.maxDistance),
    });
    // True while the camera is where the page opens it: a copied link then
    // omits the camera. A flag, not a float compare: the home radius depends
    // on the aspect, and the first placement is made at aspect 1.
    let home = !initialPose;
    place(initialPose ? cleanView(initialPose) : homeView());

    let tween = null;
    let motionReduced = reducedMotion;
    function goTo(view, { resetTarget = false } = {}) {
      if (resetTarget) controls.target.copy(target);
      if (motionReduced) {
        tween = null;
        place(view);
      } else {
        tween = { from: currentView(), to: view, start: null };
      }
      invalidate();
    }

    // ── render loop (on demand) ───────────────────────────────────
    let raf = 0;
    let lost = false;
    let firstFrameSent = false;
    cleanups.push(() => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    });
    const counting = debugEnabled();
    if (counting) {
      cleanups.push(() => {
        delete window.__anatomyDebug;
        delete window.__anatomyFrames;
      });
      window.__anatomyFrames = 0;
      window.__anatomyDebug = {
        // The mirrored side's world matrix must have a negative determinant,
        // or three would not flip its winding and the left side renders
        // inside out.
        leftDeterminant: () => {
          scene.updateMatrixWorld();
          return layers.muscles[1].matrixWorld.determinant();
        },
        rightDeterminant: () => {
          scene.updateMatrixWorld();
          return layers.muscles[0].matrixWorld.determinant();
        },
        // Read back in the same task as the draw: the drawing buffer is not
        // preserved, so a later read would see a cleared canvas.
        snapshot: () => {
          renderer.render(scene, camera);
          return canvas.toDataURL('image/png');
        },
        pose: () => cameraApi.pose(),
      };
    }

    function invalidate() {
      if (raf || disposed || lost) return;
      raf = window.requestAnimationFrame(frame);
    }

    function frame(now) {
      raf = 0;
      if (disposed || lost) return;
      // A hidden tab renders nothing; visibilitychange asks again on return.
      if (document.hidden) return;
      if (pendingS !== null && pendingS !== posedS) applyPose(pendingS);
      pendingS = null;
      // In the same frame as the pose: a depth change and the heatmap change
      // it implies must draw once, not twice.
      if (pendingHeat) {
        pendingHeat = false;
        writeColours();
      }
      let more = false;
      if (tween) {
        if (tween.start === null) tween.start = now;
        const k = (now - tween.start) / cam.tweenMs;
        place(tweenSpherical(tween.from, tween.to, k));
        if (k >= 1) tween = null;
        else more = true;
      }
      if (controls.update()) more = true;
      renderer.render(scene, camera);
      if (counting) window.__anatomyFrames += 1;
      if (!firstFrameSent) {
        firstFrameSent = true;
        onFirstFrame?.();
      }
      if (more) invalidate();
    }

    const onControlsChange = () => invalidate();
    controls.addEventListener('change', onControlsChange);
    cleanups.push(() =>
      controls.removeEventListener('change', onControlsChange)
    );
    // A user drag cancels a running preset tween rather than fighting it.
    const onControlsStart = () => {
      tween = null;
      home = false;
      onUserCamera?.();
    };
    controls.addEventListener('start', onControlsStart);
    cleanups.push(() => controls.removeEventListener('start', onControlsStart));

    function resize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      aspect = w / h;
      renderer.setSize(w, h, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      invalidate();
    }
    const ro =
      typeof window.ResizeObserver === 'function'
        ? new window.ResizeObserver(resize)
        : null;
    if (ro) ro.observe(container);
    else window.addEventListener('resize', resize);
    cleanups.push(() => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', resize);
    });
    resize();

    const onVisibility = () => {
      if (!document.hidden) invalidate();
    };
    document.addEventListener('visibilitychange', onVisibility);
    cleanups.push(() =>
      document.removeEventListener('visibilitychange', onVisibility)
    );

    // Context loss is routine on mobile (backgrounded tabs, GPU memory
    // pressure), not a defect, so it is surfaced to the user with a Retry and
    // deliberately not reported to Sentry. preventDefault lets the browser
    // offer the context back; when it does, the hook rebuilds from scratch.
    const onLost = (e) => {
      e.preventDefault();
      lost = true;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      onContextLost?.();
    };
    const onRestored = () => onContextRestored?.();
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    cleanups.push(() => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    });

    invalidate();

    const userMove = (view, opts, atHome = false) => {
      home = atHome;
      goTo(view, opts);
      onUserCamera?.();
    };
    const cameraApi = {
      reset: () => userMove(homeView(), { resetTarget: true }, true),
      preset: (name) => {
        if (!(name in PRESET_AZIMUTH)) return;
        userMove({
          radius: currentView().radius,
          polar: Math.PI / 2 - cam.presetPolarOffset,
          azimuth: PRESET_AZIMUTH[name],
        });
      },
      orbit: (dAz, dPol) =>
        userMove(orbitBy(currentView(), dAz, dPol, cam.minPolar, cam.maxPolar)),
      zoom: (f) =>
        userMove(zoomBy(currentView(), f, cam.minDistance, cam.maxDistance)),
      // Mid-tween, the destination: the view the user chose, not a blend.
      pose: () => ({ ...(tween ? tween.to : currentView()), home }),
      // A link's view, applied at once (time and layers change at once too).
      // null is the home view. Not a user move: onUserCamera stays quiet.
      setPose: (pose) => {
        tween = null;
        controls.target.copy(target);
        home = !pose;
        place(pose ? cleanView(pose) : homeView());
        invalidate();
      },
    };

    return {
      canvas,
      poser,
      setDepth(s) {
        pendingS = s;
        invalidate();
      },
      setLayers({ muscles = true, skeleton = true, body = false } = {}) {
        for (const g of layers.muscles) g.visible = muscles;
        for (const g of layers.skeleton) g.visible = skeleton;
        for (const g of layers.body) g.visible = body;
        invalidate();
      },
      setPalette(p, style0) {
        applyPalette(p, style0);
        invalidate();
      },
      // null restores the anatomy colours and tendonBlend; a Float32Array of
      // 0-1 per muscle switches to the heat ramp and tendonBlendHeat. Equal
      // weights are a no-op, so dragging the depth slider with the heatmap off
      // never touches 50,119 vertices.
      setActivation(weights = null) {
        const next = weights ?? null;
        if (sameWeights(heat, next)) return;
        heat = next;
        pendingHeat = true;
        invalidate();
      },
      setReducedMotion(reduced) {
        motionReduced = reduced;
        controls.enableDamping = !reduced;
        if (reduced && tween) {
          place(tween.to);
          tween = null;
        }
        invalidate();
      },
      camera: cameraApi,
      dispose() {
        if (disposed) return;
        disposed = true;
        teardown();
      },
    };
  } catch (error) {
    disposed = true;
    teardown();
    throw error;
  }
}
