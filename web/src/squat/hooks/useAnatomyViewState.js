import { useCallback, useMemo, useReducer } from 'react';
import {
  derivePhase,
  PHASE_CHIPS,
  sampleToS,
  stepAlongRep,
} from '../../anatomy/utils/depth.js';

// What the 3D view is showing: a depth sample, which way the bar is moving,
// and which layers are on. Nothing goes in the URL hash yet (PR2b).
const INITIAL = {
  sample: 0,
  direction: 'lowering',
  layers: { muscles: true, skeleton: true },
};

const clampSample = (n, ns) => Math.max(0, Math.min(ns - 1, Math.round(n)));

export function viewReducer(state, action) {
  switch (action.type) {
    case 'sample':
      return { ...state, sample: clampSample(action.sample, action.ns) };
    case 'step':
      return {
        ...state,
        ...stepAlongRep(state, action.delta, action.ns),
      };
    case 'direction':
      return action.direction === 'drive' || action.direction === 'lowering'
        ? { ...state, direction: action.direction }
        : state;
    case 'phase': {
      const chip = PHASE_CHIPS.find((c) => c.name === action.name);
      if (!chip) return state;
      return {
        ...state,
        sample: clampSample(chip.s * (action.ns - 1), action.ns),
        direction: chip.direction ?? state.direction,
      };
    }
    case 'layer':
      return state.layers[action.name] === undefined
        ? state
        : { ...state, layers: { ...state.layers, [action.name]: !!action.on } };
    default:
      return state;
  }
}

/** `ns` is the data's sample count (meta.S.length); null until it loads. */
export function useAnatomyViewState(ns) {
  const [state, dispatch] = useReducer(viewReducer, INITIAL);
  const n = ns ?? 2;
  const s = sampleToS(Math.min(state.sample, n - 1), n);

  const setSample = useCallback(
    (sample) => dispatch({ type: 'sample', sample, ns: n }),
    [n]
  );
  const step = useCallback(
    (delta) => dispatch({ type: 'step', delta, ns: n }),
    [n]
  );
  const setDirection = useCallback(
    (direction) => dispatch({ type: 'direction', direction }),
    []
  );
  const jumpToPhase = useCallback(
    (name) => dispatch({ type: 'phase', name, ns: n }),
    [n]
  );
  const setLayer = useCallback(
    (name, on) => dispatch({ type: 'layer', name, on }),
    []
  );

  return useMemo(
    () => ({
      ns,
      sample: state.sample,
      s,
      direction: state.direction,
      phase: derivePhase(s, state.direction),
      layers: state.layers,
      setSample,
      step,
      setDirection,
      jumpToPhase,
      setLayer,
    }),
    [ns, state, s, setSample, step, setDirection, jumpToPhase, setLayer]
  );
}
