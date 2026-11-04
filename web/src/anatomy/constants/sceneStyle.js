// The 3D scene's non-colour numbers, per theme. Every colour the scene paints
// is a palette token (anatomy* in constants/themeValues.js); what lives here is
// how it is lit and shaded, which is not a palette decision.
//
// Lights are the source page's (three r128). Their colours are float tuples
// — the page's byte channels over 255, exactly — not tokens: a light's tint is a
// lighting parameter, not ink anyone reads. Intensities are r128's; the scene
// multiplies them by π because r155 made physically correct lighting the
// default and removed the switch (SKINNING.md §7).

const LIGHTS = {
  hemisphere: {
    sky: [242 / 255, 246 / 255, 255 / 255],
    ground: [59 / 255, 53 / 255, 50 / 255],
    intensity: 0.62,
  },
  key: {
    color: [255 / 255, 255 / 255, 255 / 255],
    intensity: 0.92,
    position: [2.2, 4.0, 2.6],
    target: [0, 0.8, 0],
    shadowCamera: {
      left: -1.4,
      right: 1.4,
      top: 2.2,
      bottom: -0.5,
      near: 0.5,
      far: 10,
    },
    shadowBias: -0.0005,
    shadowNormalBias: 0.015,
  },
  rim: {
    color: [200 / 255, 220 / 255, 255 / 255],
    intensity: 0.5,
    position: [-2.6, 2.4, -2.8],
  },
  fill: {
    color: [255 / 255, 231 / 255, 210 / 255],
    intensity: 0.28,
    position: [-1.0, 1.2, 3.0],
  },
};

const BASE = {
  lights: LIGHTS,
  // The model's extent: the centre the camera orbits and frames, the radius
  // it frames, and the fixed bounding sphere given to the geometry posed every
  // frame (generous, so culling never clips a limb mid-rep).
  model: { centre: [0, 0.8, 0], radius: 1.0, boundsRadius: 2.5 },
  // Side of the square ground plane that catches the shadow, in metres.
  groundSize: 8,
  // The page used 2048; 1024 halves the shadow pass for a soft ground shadow
  // nobody inspects closely. Coarse pointers (phones) get no shadow map at all.
  shadowMapSize: 1024,
  shadowOpacity: 0.28,
  material: { roughness: 0.6, metalness: 0 },
  // Per-muscle variation around the anatomyMuscle token, so neighbouring
  // muscles read as separate bodies. The page's setHSL steps.
  jitter: { h: 0.0035, s: 0.025, l: 0.018 },
  // How far a tendon-weighted vertex moves towards the tendon colour
  // (SKINNING.md §7). The heatmap value is PR2b's.
  tendonBlend: 0.9,
  tendonBlendHeat: 0.75,
  bar: {
    radius: 0.0145,
    length: 2.2,
    plateRadius: 0.225,
    plateWidth: 0.06,
    plateOffset: 0.8,
    sleeveRadius: 0.025,
    sleeveLength: 0.42,
    // Facets around each cylinder (shaft, sleeves, plates).
    segments: 24,
    metalness: 0.6,
    roughness: 0.35,
  },
  camera: {
    fov: 35,
    near: 0.05,
    far: 30,
    target: [0, 0.8, 0],
    minDistance: 0.6,
    maxDistance: 6,
    minPolar: 0.15,
    maxPolar: 1.62,
    // A three-quarter front view from the lifter's right.
    defaultAzimuth: Math.PI / 2 - 0.65,
    defaultPolar: 1.32,
    defaultDistance: 3.6,
    tweenMs: 320,
    // Front/Back/Left/Right sit just above the horizon, not exactly on it,
    // so the floor reads as a plane rather than a line.
    presetPolarOffset: 0.08,
  },
};

export const SCENE_STYLE = {
  dark: BASE,
  // On the light stage a shadow reads much stronger against the pale ground,
  // so it is kept lighter (lower opacity) before it reads as dirt.
  light: { ...BASE, shadowOpacity: 0.18 },
};

export const sceneStyle = (themeName) =>
  SCENE_STYLE[themeName] ?? SCENE_STYLE.light;
