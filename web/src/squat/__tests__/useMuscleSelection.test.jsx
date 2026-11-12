import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, renderHook } from '@testing-library/react';
import { useMuscleSelection } from '../hooks/useMuscleSelection.js';
import { useSquatHashState } from '../hooks/useSquatHashState.js';
import { useAnatomyViewState } from '../hooks/useAnatomyViewState.js';
import { STALE_LINK } from '../constants/activationBands.js';
import { buildMuscleIndex } from '../utils/muscleIndex.js';

const manifest = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/squat/assets/squat-manifest.json'),
    'utf8'
  )
);
const LOADED = buildMuscleIndex(manifest.meta.muscles);
const EMPTY = buildMuscleIndex(undefined);

// The real hash hook, so replaceState-vs-pushState is exercised for real.
function harness(index) {
  return renderHook(
    ({ index: idx }) => {
      const [hash, setHash] = useSquatHashState();
      return {
        hash,
        setHash,
        sel: useMuscleSelection({ index: idx, hash, setHash }),
      };
    },
    { initialProps: { index } }
  );
}

beforeEach(() => window.history.replaceState(null, '', '/squat'));

describe('useMuscleSelection', () => {
  it('derives the selection from the hash — no second copy of the state', () => {
    window.history.replaceState(null, '', '/squat#m=soleus');
    const { result } = harness(LOADED);
    expect(result.current.sel.slug).toBe('soleus');
    expect(result.current.sel.muscle.name).toBe('Soleus');
    expect(result.current.sel.notice).toBeNull();
  });

  it('HOLDS the slug while the manifest is still loading', () => {
    window.history.replaceState(null, '', '/squat#m=soleus');
    const { result, rerender } = harness(EMPTY);
    // The single most likely bug in this change: clearing here destroys the
    // deep link on the first render, before there is anything to resolve.
    expect(result.current.sel.slug).toBe('soleus');
    expect(result.current.sel.muscle).toBeNull();
    expect(result.current.sel.notice).toBeNull();
    expect(window.location.hash).toBe('#m=soleus');
    rerender({ index: LOADED });
    expect(result.current.sel.muscle.name).toBe('Soleus');
    expect(window.location.hash).toBe('#m=soleus');
  });

  it('reports a dead slug once the index exists, and drops it from the URL', () => {
    window.history.replaceState(null, '', '/squat#m=not-a-muscle');
    const { result } = harness(LOADED);
    expect(result.current.sel.notice).toBe(STALE_LINK);
    expect(result.current.sel.muscle).toBeNull();
    // Dropped, so it does not survive a reload or get re-shared...
    expect(window.location.hash).toBe('');
    // ...but the message outlives the very update that dropped it.
    expect(result.current.sel.slug).toBeNull();
  });

  it('clears the notice on the next real selection', () => {
    window.history.replaceState(null, '', '/squat#m=not-a-muscle');
    const { result } = harness(LOADED);
    expect(result.current.sel.notice).toBe(STALE_LINK);
    act(() => result.current.sel.select('soleus'));
    expect(result.current.sel.notice).toBeNull();
    expect(window.location.hash).toBe('#m=soleus');
  });

  it('clears the notice when a hashchange lands on a live muscle', () => {
    window.history.replaceState(null, '', '/squat#m=not-a-muscle');
    const { result } = harness(LOADED);
    expect(result.current.sel.notice).toBe(STALE_LINK);
    // Back, or a pasted link — not a select(). The alert must not outlive it.
    act(() => {
      window.history.replaceState(null, '', '/squat#m=soleus');
      window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    });
    expect(result.current.sel.muscle.name).toBe('Soleus');
    expect(result.current.sel.notice).toBeNull();
  });

  it('keeps holding a slug when the index never arrives', () => {
    window.history.replaceState(null, '', '/squat#m=soleus');
    const { result, rerender } = harness(EMPTY);
    rerender({ index: EMPTY });
    rerender({ index: EMPTY });
    expect(window.location.hash).toBe('#m=soleus');
    expect(result.current.sel.notice).toBeNull();
    expect(result.current.sel.slug).toBe('soleus');
  });

  it('writes and removes the slug through select and clear', () => {
    const { result } = harness(LOADED);
    act(() => result.current.sel.select('gracilis'));
    expect(window.location.hash).toBe('#m=gracilis');
    expect(result.current.sel.muscle.name).toBe('Gracilis');
    act(() => result.current.sel.clear());
    expect(window.location.hash).toBe('');
    expect(result.current.sel.muscle).toBeNull();
  });

  it('keeps the other hash keys, in their stable order', () => {
    window.history.replaceState(null, '', '/squat#guide=metrics&paused');
    const { result } = harness(LOADED);
    act(() => result.current.sel.select('soleus'));
    expect(window.location.hash).toBe('#guide=metrics&m=soleus&paused');
  });

  it('adds NO history entry per selection, so Back stays sane', () => {
    const { result } = harness(LOADED);
    const before = window.history.length;
    act(() => result.current.sel.select('soleus'));
    act(() => result.current.sel.select('gracilis'));
    act(() => result.current.sel.select('popliteus'));
    act(() => result.current.sel.clear());
    expect(window.history.length).toBe(before);
  });

  it('follows a hashchange, so Back and a pasted link both land', () => {
    const { result } = harness(LOADED);
    act(() => {
      window.history.replaceState(null, '', '/squat#m=popliteus');
      window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    });
    expect(result.current.sel.muscle.name).toBe('Popliteus');
  });
});

describe('useAnatomyViewState heatmap', () => {
  it('is off by default and a sibling of layers, never inside them', () => {
    const { result } = renderHook(() => useAnatomyViewState(null));
    expect(result.current.heatmap).toBe(false);
    expect(result.current.layers).toEqual({ muscles: true, skeleton: true });
    expect(result.current.layers.heatmap).toBeUndefined();
  });

  it('toggles without disturbing the layers', () => {
    const { result } = renderHook(() => useAnatomyViewState(null));
    act(() => result.current.setHeatmap(true));
    expect(result.current.heatmap).toBe(true);
    expect(result.current.layers).toEqual({ muscles: true, skeleton: true });
    act(() => result.current.setHeatmap(false));
    expect(result.current.heatmap).toBe(false);
  });

  it('coerces whatever it is handed to a boolean', () => {
    const { result } = renderHook(() => useAnatomyViewState(null));
    act(() => result.current.setHeatmap('yes'));
    expect(result.current.heatmap).toBe(true);
    act(() => result.current.setHeatmap(undefined));
    expect(result.current.heatmap).toBe(false);
  });

  it('is ignored by the layer action, which only knows meshes', () => {
    const { result } = renderHook(() => useAnatomyViewState(null));
    act(() => result.current.setLayer('heatmap', true));
    expect(result.current.heatmap).toBe(false);
    expect(result.current.layers.heatmap).toBeUndefined();
  });
});
