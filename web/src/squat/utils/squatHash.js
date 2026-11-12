import { SCENE_STYLE } from '../../anatomy/constants/sceneStyle.js';
import { fromDegrees, toDegrees } from '../../anatomy/utils/cameraPose.js';

// The /squat URL grammar. A link is public from the moment it is sent, so this
// module is a contract: shareLinks.golden.test.jsx pins what existing links
// open, and any change to it is a breaking change.
//
// Deep-link state rides in the hash so the Vercel catch-all rewrite never has
// to know about it: #guide=metrics&t=1.60&tab=moments&paused. Unknown keys and
// malformed values are dropped rather than trusted. Moved here from
// utils/squatRoute.js, which RouteRoot reads at first paint: only the tool
// itself parses a hash, so these bytes now load with the tool, not with the
// dashboard.

export const GUIDE_PANE_IDS = [
  'phases',
  'metrics',
  'measured',
  'method',
  'sources',
];
export const GRAPH_TAB_IDS = ['angles', 'moments', 'force', 'act', 'len'];
export const LAYER_IDS = ['muscles', 'skeleton'];

// `m` is a muscle slug, validated by shape only. The tool resolves it against
// the manifest itself and reports a dead link.
export const MUSCLE_SLUG_RE = /^[a-z0-9-]{1,64}$/;

// Seconds. Past the rep's end a time clamps to the last frame; this cap keeps
// a hand-typed time of hundreds of digits from parsing as Infinity, which
// would otherwise drop the key and open on frame 0.
export const T_MAX = 600;

// The scene's own limits, not cameraMath's wider defaults. Identical in both
// themes (SCENE_STYLE.light spreads the same BASE), so no scene is needed to
// clean a link: a device without 3D re-emits exactly what it was given.
const { minPolar, maxPolar, minDistance, maxDistance } =
  SCENE_STYLE.light.camera;
export const CAM_LIMITS = { minPolar, maxPolar, minDistance, maxDistance };

const CAM_RE = /^-?\d{1,4}(\.\d+)?,\d{1,3}(\.\d+)?,\d{1,2}(\.\d+)?$/;

const empty = () => ({
  guide: null,
  t: null,
  tab: null,
  m: null,
  paused: false,
  cam: null,
  hide: null,
  heat: false,
});

/** Degrees in, cleaned degrees out: az wrapped, pol and dist clamped. */
const cleanCam = (cam) =>
  cam && [cam.az, cam.pol, cam.dist].every((v) => Number.isFinite(v))
    ? poseToCam(camToPose(cam))
    : null;

export const camToPose = (cam) => (cam ? fromDegrees(cam, CAM_LIMITS) : null);

export const poseToCam = (pose) => (pose ? toDegrees(pose, CAM_LIMITS) : null);

const cleanHide = (ids) => {
  const out = LAYER_IDS.filter((id) => ids?.includes(id));
  return out.length ? out : null;
};

export function parseSquatHash(hash) {
  const out = empty();
  const body = (hash || '').replace(/^#/, '');
  if (!body) return out;
  for (const part of body.split('&')) {
    const eq = part.indexOf('=');
    const key = eq === -1 ? part : part.slice(0, eq);
    const raw = eq === -1 ? '' : part.slice(eq + 1);
    let value;
    try {
      value = decodeURIComponent(raw);
    } catch {
      // A malformed escape is a hand-edited URL, not an error worth reporting.
      continue;
    }
    if (key === 'guide' && GUIDE_PANE_IDS.includes(value)) out.guide = value;
    else if (key === 'tab' && GRAPH_TAB_IDS.includes(value)) out.tab = value;
    else if (key === 't' && /^\d+(\.\d+)?$/.test(value)) {
      out.t = Math.min(T_MAX, Number(value));
    } else if (key === 'm' && MUSCLE_SLUG_RE.test(value)) out.m = value;
    else if (key === 'paused') out.paused = true;
    else if (key === 'cam' && CAM_RE.test(value)) {
      // Atomic: a half-valid pose is ignored whole, never half-applied.
      const [az, pol, dist] = value.split(',').map(Number);
      out.cam = cleanCam({ az, pol, dist });
    } else if (key === 'hide') {
      const hide = cleanHide(value.split(','));
      if (hide) out.hide = hide;
    } else if (key === 'heat' && (value === '' || value === '1')) {
      out.heat = true;
    }
  }
  return out;
}

// Re-validates every field, so it is safe on unclean input. The first five
// keys keep the order R8 wrote them in, so every link sent before R11 is
// byte-identical.
export function formatSquatHash({
  guide,
  t,
  tab,
  m,
  paused,
  cam,
  hide,
  heat,
} = {}) {
  const parts = [];
  if (guide && GUIDE_PANE_IDS.includes(guide)) parts.push(`guide=${guide}`);
  if (typeof t === 'number' && Number.isFinite(t) && t >= 0) {
    parts.push(`t=${Math.min(T_MAX, t).toFixed(2)}`);
  }
  if (tab && GRAPH_TAB_IDS.includes(tab)) parts.push(`tab=${tab}`);
  if (typeof m === 'string' && MUSCLE_SLUG_RE.test(m)) parts.push(`m=${m}`);
  if (paused) parts.push('paused');
  const c = cleanCam(cam);
  if (c) parts.push(`cam=${c.az},${c.pol},${c.dist.toFixed(2)}`);
  const h = cleanHide(hide);
  if (h) parts.push(`hide=${h.join(',')}`);
  if (heat) parts.push('heat');
  return parts.length ? `#${parts.join('&')}` : '';
}

/**
 * The state a Copy press shares: the live view, not the address bar. Defaults
 * are left out, so an untouched view is bare /squat. The guide pane is never
 * shared from the button (it is closed whenever the button can be pressed).
 * `scenePose` is the scene's own pose (null with no 3D), and `carriedCam` the
 * camera a link arrived with, re-emitted when there is no scene to read.
 */
export function shareState({
  frame,
  t,
  m = null,
  tab = null,
  layers,
  heatmap,
  scenePose = null,
  carriedCam = null,
}) {
  const moved = frame > 0;
  let cam = carriedCam;
  if (scenePose) cam = scenePose.home ? null : poseToCam(scenePose);
  return {
    guide: null,
    t: moved ? t : null,
    tab,
    m,
    paused: moved,
    cam: cleanCam(cam),
    hide: cleanHide(LAYER_IDS.filter((id) => layers && !layers[id])),
    heat: !!heatmap,
  };
}

/** Origin plus /squat plus the hash: any query string is dropped. */
export const shareUrl = (origin, state) =>
  `${origin}/squat${formatSquatHash(state)}`;
