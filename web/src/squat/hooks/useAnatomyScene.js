import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { captureError } from '../../utils/sentry.js';
import { loadSceneModule } from '../../anatomy/scene/loadScene.js';
import { scenePalette } from '../../anatomy/utils/sceneColours.js';
import { sceneStyle } from '../../anatomy/constants/sceneStyle.js';
import { activationAt } from '../utils/activation.js';
import { focusMask } from '../utils/strainFocus.js';

const isOffline = () =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

/**
 * Owns the 3D scene's lifecycle: fetch the three.js chunk, build the scene
 * into the container, then keep it in step with the view, theme and motion
 * preference — without ever rebuilding for those.
 *
 * status: idle → loading (the chunk) → building → ready (first frame drawn),
 * or error (errorKind 'load' | 'build'), or contextlost. `retry` rebuilds.
 *
 * StrictMode-safe: every build is paired with its own dispose, and a build
 * that resolves after its effect was torn down disposes itself.
 *
 * `pose` is a shared link's camera (null for the home view), built in as the
 * first frame's pose and re-applied each time a new link `arrival`s; the
 * scene's own moves never count as one. `onUserCamera` is told whenever the
 * user moves the camera.
 *
 * `focus` is `{ top, selected }`: manifest indices of the muscles the strain
 * readout names (empty with the heatmap off) and the selected muscle's index
 * (or null). They are lifted out of the rest on the model (PR B).
 */
export function useAnatomyScene({
  containerRef,
  manifest,
  buffer,
  ready,
  view,
  themeName,
  reducedMotion,
  coarsePointer = false,
  loadScene = loadSceneModule,
  pose = null,
  arrival = 0,
  onUserCamera,
  focus = null,
}) {
  const [state, setState] = useState({ status: 'idle', errorKind: null });
  const [attempt, setAttempt] = useState(0);
  const [controller, setController] = useState(null);
  // Read at build time only; later changes go through the setters below.
  const latest = useRef({
    view,
    themeName,
    reducedMotion,
    pose,
    arrival,
    onUserCamera,
  });
  useEffect(() => {
    latest.current = {
      view,
      themeName,
      reducedMotion,
      pose,
      arrival,
      onUserCamera,
    };
  });
  // The arrival whose camera the live scene shows.
  const appliedArrival = useRef(arrival);

  useEffect(() => {
    const container = containerRef.current;
    if (!ready || !manifest || !buffer || !container) {
      // Functional and idempotent: an effect re-run while idle must not
      // schedule another render.
      setState((prev) =>
        prev.status === 'idle' ? prev : { status: 'idle', errorKind: null }
      );
      return undefined;
    }
    let cancelled = false;
    let ctl = null;
    let timer = 0;
    setState({ status: 'loading', errorKind: null });

    loadScene().then(
      (mod) => {
        if (cancelled) return;
        setState({ status: 'building', errorKind: null });
        // A tick so "Building 3D model" paints before the synchronous build.
        timer = setTimeout(() => {
          if (cancelled) return;
          const {
            view: v,
            themeName: t,
            reducedMotion: rm,
            pose: p,
            arrival: a,
          } = latest.current;
          try {
            ctl = mod.createAnatomyScene({
              container,
              manifest,
              buffer,
              palette: scenePalette(t),
              style: sceneStyle(t),
              reducedMotion: rm,
              coarsePointer,
              initialPose: p,
              onUserCamera: () => latest.current.onUserCamera?.(),
              onFirstFrame: () => {
                if (!cancelled) setState({ status: 'ready', errorKind: null });
              },
              onContextLost: () => {
                if (!cancelled)
                  setState({ status: 'contextlost', errorKind: 'contextlost' });
              },
              onContextRestored: () => {
                if (!cancelled) setAttempt((n) => n + 1);
              },
            });
            ctl.setDepth(v.s);
            ctl.setLayers(v.layers);
            appliedArrival.current = a;
            setController(ctl);
          } catch (error) {
            captureError(error, {
              where: 'useAnatomyScene',
              stage: 'build',
              attempt,
            });
            ctl?.dispose();
            ctl = null;
            setState({ status: 'error', errorKind: 'build' });
          }
        }, 0);
      },
      (error) => {
        if (cancelled) return;
        // Offline, a failed chunk fetch is the expected first-visit state
        // (the UI says so), not a defect, so it is not reported. Online it
        // is a real failure.
        if (!isOffline()) {
          captureError(error, {
            where: 'useAnatomyScene',
            stage: 'import',
            attempt,
          });
        }
        setState({ status: 'error', errorKind: 'load' });
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
      ctl?.dispose();
      setController(null);
    };
  }, [
    containerRef,
    manifest,
    buffer,
    ready,
    coarsePointer,
    loadScene,
    attempt,
  ]);

  useEffect(() => {
    if (!controller || appliedArrival.current === arrival) return;
    appliedArrival.current = arrival;
    controller.camera.setPose(latest.current.pose);
  }, [controller, arrival]);

  useEffect(() => {
    controller?.setDepth(view.s);
  }, [controller, view.s]);

  useEffect(() => {
    controller?.setLayers(view.layers);
  }, [controller, view.layers]);

  useEffect(() => {
    controller?.setPalette(scenePalette(themeName), sceneStyle(themeName));
  }, [controller, themeName]);

  // Memoised, so the effect fires on a real change rather than every render,
  // and so a depth drag with the heatmap off allocates nothing.
  const activation = useMemo(
    () =>
      view.heatmap && manifest
        ? activationAt(manifest.meta.muscles, view.s, view.direction)
        : null,
    [view.heatmap, view.s, view.direction, manifest]
  );

  useEffect(() => {
    controller?.setActivation(activation);
  }, [controller, activation]);

  const muscleCount = manifest?.meta.muscles.length ?? 0;
  const top = focus?.top;
  const selected = focus?.selected ?? null;
  // Keyed on the indices, not the array: the readout rebuilds its list every
  // frame, and the mask only changes when the regions or the selection do.
  const topKey = top?.join(',') ?? '';
  const mask = useMemo(
    () =>
      focusMask(
        muscleCount,
        topKey ? topKey.split(',').map(Number) : null,
        selected
      ),
    [muscleCount, topKey, selected]
  );

  useEffect(() => {
    controller?.setFocus(mask);
  }, [controller, mask]);

  useEffect(() => {
    controller?.setReducedMotion(reducedMotion);
  }, [controller, reducedMotion]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // Stable across renders, and safe to call before the scene exists.
  const ctlRef = useRef(null);
  useEffect(() => {
    ctlRef.current = controller;
  }, [controller]);
  const camera = useMemo(
    () => ({
      reset: () => ctlRef.current?.camera.reset(),
      preset: (name) => ctlRef.current?.camera.preset(name),
      orbit: (dAz, dPol) => ctlRef.current?.camera.orbit(dAz, dPol),
      zoom: (f) => ctlRef.current?.camera.zoom(f),
      // {radius, polar, azimuth, home}, or null with no scene to ask.
      pose: () => ctlRef.current?.camera.pose?.() ?? null,
    }),
    []
  );

  return { ...state, retry, camera };
}
