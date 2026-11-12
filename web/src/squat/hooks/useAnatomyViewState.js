import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  directionAt,
  frameAt,
  repInfo,
  timeAt,
} from '../../anatomy/utils/rep.js';
import { PHASES } from '../constants/phases.js';

// What the 3D view is showing: a frame of the reference rep, whether it is
// playing, which layers are on, and whether the activation heatmap is
// colouring them. Of these, only the time is written to the URL hash, by
// SquatApp once a move settles; `moved` is what keeps the first load, and a
// link applied on arrival, from writing it back.
//
// `heatmap` is a sibling of `layers`, not a member: layers are meshes and
// setLayers' contract is {muscles, skeleton, body}, while the heatmap is a
// colouring mode over whichever meshes are showing.
const INITIAL = {
  frame: 0,
  playing: false,
  moved: false,
  layers: { muscles: true, skeleton: true },
  heatmap: false,
};

const clampFrame = (n, last) => Math.max(0, Math.min(last, Math.round(n)));

export function viewReducer(state, action) {
  switch (action.type) {
    // A link arriving: the whole view becomes the link. Never playing, and
    // not a user move, so nothing is written back over the link just opened.
    case 'link':
      return {
        ...state,
        frame:
          action.frame === undefined
            ? state.frame
            : clampFrame(action.frame, action.last),
        layers: action.layers ?? state.layers,
        heatmap: action.heatmap ?? state.heatmap,
        playing: false,
        moved: false,
      };
    case 'frame':
      return {
        ...state,
        frame: clampFrame(action.frame, action.last),
        playing: false,
        moved: true,
      };
    case 'step':
      return {
        ...state,
        frame: clampFrame(state.frame + action.delta, action.last),
        playing: false,
        moved: true,
      };
    case 'phase': {
      const to = action.starts?.[action.code];
      if (to === undefined) return state;
      return { ...state, frame: to, playing: false, moved: true };
    }
    case 'play':
      return {
        ...state,
        frame: state.frame >= action.last ? 0 : state.frame,
        playing: true,
        moved: true,
      };
    case 'pause':
      return state.playing ? { ...state, playing: false, moved: true } : state;
    case 'tick': {
      if (!state.playing) return state;
      const next = state.frame + (action.delta ?? 1);
      return next >= action.last
        ? { ...state, frame: action.last, playing: false }
        : { ...state, frame: next };
    }
    case 'layer':
      return state.layers[action.name] === undefined
        ? state
        : { ...state, layers: { ...state.layers, [action.name]: !!action.on } };
    case 'heatmap':
      return { ...state, heatmap: !!action.on };
    default:
      return state;
  }
}

const layersOf = (hide) => ({
  muscles: !hide?.includes('muscles'),
  skeleton: !hide?.includes('skeleton'),
});

const NO_LINK = { arrival: 0, t: null, hide: null, heat: false };

/**
 * `rep` is the manifest's meta.rep (null until it loads). `link` is the hash's
 * view keys plus its `arrival` count (useSquatHashState): the view starts as
 * the link, and becomes the link again each time a new one arrives. Its own
 * hash writes are not arrivals, so they are never fed back.
 */
export function useAnatomyViewState(rep, link = NO_LINK) {
  const [state, dispatch] = useReducer(viewReducer, link, (l) => ({
    ...INITIAL,
    layers: layersOf(l.hide),
    heatmap: !!l.heat,
  }));
  const info = useMemo(() => repInfo(rep, PHASES.length), [rep]);

  // Read in the effect below, which keys on the arrival alone.
  const latest = useRef(link);
  useEffect(() => {
    latest.current = link;
  });
  // Which arrival the layers, and the time, were last applied for. Layers
  // apply at once; the time waits for the rep, which it needs to snap to a
  // frame. The initial state already holds arrival 0's layers.
  const applied = useRef({ layers: link.arrival, seek: null });
  useEffect(() => {
    const l = latest.current;
    const a = applied.current;
    const layersDue = a.layers !== l.arrival;
    const seekDue = !!info && a.seek !== l.arrival;
    if (!layersDue && !seekDue) return;
    a.layers = l.arrival;
    if (seekDue) a.seek = l.arrival;
    dispatch({
      type: 'link',
      ...(layersDue && { layers: layersOf(l.hide), heatmap: !!l.heat }),
      ...(seekDue && { frame: frameAt(info, l.t ?? 0), last: info.last }),
    });
  }, [info, link.arrival]);

  // setInterval, not rAF, and nothing runs while paused. Each tick advances by
  // the frames of elapsed time, not by one: a device that cannot render at
  // 50 Hz skips frames rather than playing the rep in slow motion. The clock is
  // window.performance.now(), which is monotonic, so a wall-clock step backwards
  // cannot stall playback. The tick reads the current frame inside the reducer.
  useEffect(() => {
    if (!state.playing || !info) return;
    const ms = info.dt * 1000;
    let due = window.performance.now();
    const id = setInterval(() => {
      const delta = Math.floor((window.performance.now() - due) / ms);
      if (delta < 1) return;
      due += delta * ms;
      dispatch({ type: 'tick', delta, last: info.last });
    }, ms);
    return () => clearInterval(id);
  }, [state.playing, info]);

  const setFrame = useCallback(
    (frame) => info && dispatch({ type: 'frame', frame, last: info.last }),
    [info]
  );
  const setTime = useCallback(
    (sec) =>
      info &&
      dispatch({ type: 'frame', frame: frameAt(info, sec), last: info.last }),
    [info]
  );
  const step = useCallback(
    (delta) => info && dispatch({ type: 'step', delta, last: info.last }),
    [info]
  );
  const jumpToPhase = useCallback(
    (code) => info && dispatch({ type: 'phase', code, starts: info.starts }),
    [info]
  );
  const play = useCallback(
    () => info && dispatch({ type: 'play', last: info.last }),
    [info]
  );
  const pause = useCallback(() => info && dispatch({ type: 'pause' }), [info]);
  const setLayer = useCallback(
    (name, on) => dispatch({ type: 'layer', name, on }),
    []
  );
  const setHeatmap = useCallback((on) => dispatch({ type: 'heatmap', on }), []);

  return useMemo(() => {
    const actions = {
      playing: state.playing,
      moved: state.moved,
      layers: state.layers,
      heatmap: state.heatmap,
      setFrame,
      setTime,
      step,
      jumpToPhase,
      play,
      pause,
      setLayer,
      setHeatmap,
    };
    if (!info) {
      return {
        ...actions,
        ready: false,
        dt: null,
        frames: 0,
        frame: 0,
        t: 0,
        s: 0,
        pct: 0,
        phaseCode: null,
        phase: null,
        direction: 'lowering',
      };
    }
    const frame = Math.min(state.frame, info.last);
    const s = info.s[frame];
    const phaseCode = info.ph[frame];
    return {
      ...actions,
      ready: true,
      dt: info.dt,
      frames: info.frames,
      frame,
      t: timeAt(info, frame),
      s,
      pct: Math.round(s * 100),
      phaseCode,
      phase: PHASES[phaseCode].name,
      direction: directionAt(info, frame),
    };
  }, [
    info,
    state,
    setFrame,
    setTime,
    step,
    jumpToPhase,
    play,
    pause,
    setLayer,
    setHeatmap,
  ]);
}
