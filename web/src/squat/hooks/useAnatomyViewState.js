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
// colouring them. Only the time reaches the URL hash, written by SquatApp
// once a move settles; `moved` is what keeps the first load from writing it.
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
    case 'seed':
      return { ...state, frame: clampFrame(action.frame, action.last) };
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

/**
 * `rep` is the manifest's meta.rep (null until it loads); `initialT` the
 * hash's t, applied once when the rep arrives. Later hash edits are not
 * followed.
 */
export function useAnatomyViewState(rep, initialT) {
  const [state, dispatch] = useReducer(viewReducer, INITIAL);
  const info = useMemo(() => repInfo(rep, PHASES.length), [rep]);

  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !info) return;
    seeded.current = true;
    if (typeof initialT === 'number') {
      dispatch({
        type: 'seed',
        frame: frameAt(info, initialT),
        last: info.last,
      });
    }
  }, [info, initialT]);

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
