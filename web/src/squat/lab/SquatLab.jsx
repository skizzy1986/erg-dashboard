import { useEffect, useMemo, useRef, useState } from 'react';
import manifestUrl from '../assets/squat-manifest.json?url';
import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { RADIUS, SPACE } from '../../constants/tokens.js';
import { alpha } from '../../utils/themeCss.js';
import { PHASES } from '../constants/phases.js';
import { ACT_BANDS, ACT_NOTE } from '../constants/activationBands.js';
import { useAnatomyData } from '../hooks/useAnatomyData.js';
import { useCapabilities } from '../hooks/useCapabilities.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { useSquatHashState } from '../hooks/useSquatHashState.js';
import { useSquatTheme } from '../hooks/useSquatTheme.js';
import { useAnatomyViewState } from '../hooks/useAnatomyViewState.js';
import { useAnatomyScene } from '../hooks/useAnatomyScene.js';
import { useMuscleSelection } from '../hooks/useMuscleSelection.js';
import {
  buildMuscleIndex,
  filterMuscles,
  slugify,
} from '../utils/muscleIndex.js';
import {
  activationAt,
  activationOf,
  bandOf,
  peakBandOf,
} from '../utils/activation.js';
import { loadSceneModule } from '../../anatomy/scene/loadScene.js';
import SquatHeader from '../components/SquatHeader.jsx';
import SquatStage from '../components/SquatStage.jsx';
import MuscleList from '../components/MuscleList.jsx';
import MuscleCard from '../components/MuscleCard.jsx';
import GuideDialog from '../components/GuideDialog.jsx';
import AttributionFooter from '../components/AttributionFooter.jsx';
import { toggle } from '../components/TimeControls.jsx';
import { microLabel, mono, srOnly } from '../components/ui.js';
import {
  cameraFor,
  portraitPullback,
  shotFor,
  targetHeight,
} from './directorShot.js';
import { STRAIN_TITLE, topMuscles } from './strainFocus.js';

const WIDE_QUERY = '(min-width: 761px)';
const COARSE_QUERY = '(pointer: coarse)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
// Pause on the lockout before the rep loops, so the eye can reset.
const LOOP_HOLD_MS = 700;

export const CAMERA_MODES = [
  { id: 'director', name: 'Director' },
  { id: 'showoff', name: 'Show-off' },
  { id: 'manual', name: 'Fixed' },
];
const PRESETS = [
  ['front', 'Front'],
  ['back', 'Back'],
  ['left', 'Left'],
  ['right', 'Right'],
];

const BAND_TOKEN = { low: THEME.textSubtle, mod: THEME.text, high: THEME.text };

const glass = {
  background: alpha(THEME.surface, 'e6'),
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: `1px solid ${THEME.border}`,
  borderRadius: RADIUS.md,
  boxSizing: 'border-box',
};

function StrainPanel({ muscles, top, weights, selected, onPick, compact }) {
  return (
    <div
      data-testid="strain-panel"
      style={{ ...glass, padding: compact ? SPACE.sm : SPACE.md }}
    >
      <h2 style={{ ...microLabel, margin: 0 }}>{STRAIN_TITLE}</h2>
      <ol
        style={{
          listStyle: 'none',
          margin: `${SPACE.xs}px 0 0`,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {top.map((i, rank) => {
          const band = bandOf(weights[i]);
          const on = selected === i;
          return (
            <li key={muscles[i].name}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onPick(on ? null : i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: SPACE.sm,
                  width: '100%',
                  minHeight: 36,
                  padding: `2px ${SPACE.xs}px`,
                  background: on ? alpha(THEME.accent, '18') : 'transparent',
                  border: 'none',
                  borderRadius: RADIUS.sm,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: FONT.sans,
                  color: THEME.text,
                }}
              >
                <span style={{ ...mono, fontSize: 11, color: THEME.accent }}>
                  {rank + 1}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: compact ? 12 : 13,
                    fontWeight: 600,
                    lineHeight: 1.25,
                  }}
                >
                  {muscles[i].name}
                </span>
                {band && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: BAND_TOKEN[band.id],
                    }}
                  >
                    {band.name}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      {!compact && (
        <div
          aria-hidden="true"
          style={{
            marginTop: SPACE.sm,
            height: 6,
            borderRadius: RADIUS.pill,
            background: `linear-gradient(90deg, ${THEME.anatomyHeatLow}, ${THEME.anatomyHeatMid}, ${THEME.anatomyHeatHigh}, ${THEME.anatomyHeatPeak})`,
          }}
        />
      )}
      {!compact && (
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: THEME.textSubtle,
            marginTop: 2,
          }}
        >
          {ACT_BANDS.map((b) => (
            <span key={b.id}>{b.name}</span>
          ))}
        </div>
      )}
      <p
        style={{
          margin: `${SPACE.xs}px 0 0`,
          fontSize: 11,
          color: THEME.modelled,
          fontWeight: 700,
        }}
      >
        {ACT_NOTE}
      </p>
    </div>
  );
}

function Dock({
  view,
  disabled,
  mode,
  onMode,
  onPreset,
  heatmap,
  onHeatmap,
  spotlight,
  onSpotlight,
  onPlay,
  onPause,
  onUserTime,
  wide,
}) {
  const last = view.ready ? view.frames - 1 : 1;
  const row = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACE.xs,
  };
  return (
    <div
      data-testid="lab-dock"
      style={{
        ...glass,
        padding: wide ? SPACE.md : SPACE.sm,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.sm,
      }}
    >
      <div style={{ ...row, flexWrap: 'nowrap', gap: SPACE.sm }}>
        <button
          type="button"
          onClick={view.playing ? onPause : onPlay}
          disabled={!view.ready}
          style={{ ...toggle(view.playing, !view.ready), minWidth: 76 }}
        >
          {view.playing ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          aria-label="Rep frame"
          min={0}
          max={last}
          step={1}
          value={view.frame}
          disabled={!view.ready}
          onChange={(e) => {
            onUserTime();
            view.setFrame(Number(e.target.value));
          }}
          style={{ flex: 1, minWidth: 0, accentColor: THEME.accent }}
        />
        <span
          style={{
            ...mono,
            fontSize: 12,
            minWidth: wide ? 150 : 52,
            textAlign: 'right',
            color: THEME.textSubtle,
          }}
        >
          {view.ready
            ? wide
              ? `${view.t.toFixed(2)} s · ${view.pct}% depth`
              : `${view.pct}%`
            : '—'}
        </span>
      </div>
      <div style={{ ...row, justifyContent: 'space-between' }}>
        <div role="group" aria-label="Jump to phase" style={row}>
          {PHASES.map((ph, code) => (
            <button
              key={ph.id}
              type="button"
              aria-label={ph.name}
              aria-pressed={view.phaseCode === code}
              disabled={!view.ready}
              onClick={() => {
                onUserTime();
                view.jumpToPhase(code);
              }}
              style={{
                ...toggle(view.phaseCode === code, !view.ready),
                minHeight: 36,
                padding: `${SPACE.xs}px ${SPACE.sm}px`,
                fontSize: 12,
              }}
            >
              {wide ? ph.name : String(code + 1)}
            </button>
          ))}
        </div>
        <div style={row}>
          <div role="group" aria-label="Camera" style={row}>
            {CAMERA_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                disabled={disabled}
                onClick={() => onMode(m.id)}
                style={{
                  ...toggle(mode === m.id, disabled),
                  minHeight: 36,
                  padding: `${SPACE.xs}px ${SPACE.sm}px`,
                  fontSize: 12,
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={heatmap}
            disabled={disabled}
            onClick={() => onHeatmap(!heatmap)}
            style={{
              ...toggle(heatmap, disabled),
              minHeight: 36,
              padding: `${SPACE.xs}px ${SPACE.sm}px`,
              fontSize: 12,
            }}
          >
            Heatmap
          </button>
          <button
            type="button"
            aria-pressed={spotlight}
            disabled={disabled}
            onClick={() => onSpotlight(!spotlight)}
            style={{
              ...toggle(spotlight, disabled),
              minHeight: 36,
              padding: `${SPACE.xs}px ${SPACE.sm}px`,
              fontSize: 12,
            }}
          >
            Spotlight
          </button>
        </div>
      </div>
      {mode === 'manual' && (
        <div role="group" aria-label="Fixed angle" style={row}>
          {PRESETS.map(([id, name]) => (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onPreset(id)}
              style={{
                ...toggle(false, disabled),
                minHeight: 36,
                padding: `${SPACE.xs}px ${SPACE.sm}px`,
                fontSize: 12,
              }}
            >
              {name}
            </button>
          ))}
          <span style={{ fontSize: 11, color: THEME.textSubtle }}>
            Drag to orbit, pinch or scroll to zoom.
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * PROTOTYPE at /squat?lab. Director and show-off cameras driven by the
 * playhead, a top-3 strain readout with a spotlight on the model, and a
 * stage-first layout with every tool docked on the stage.
 */
export default function SquatLab({ loadScene = loadSceneModule } = {}) {
  const wide = useMediaQuery(WIDE_QUERY);
  const coarsePointer = useMediaQuery(COARSE_QUERY);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const { preference, resolved, setPreference } = useSquatTheme();
  const capabilities = useCapabilities();
  const [hash, setHash] = useSquatHashState();
  const data = useAnatomyData({ manifestUrl, capabilities });
  const view = useAnatomyViewState(data.manifest?.meta.rep ?? null, null);
  const muscles = data.manifest?.meta.muscles;
  const info = useMemo(() => {
    const rep = data.manifest?.meta.rep;
    if (!rep || !view.ready) return null;
    const starts = [];
    rep.ph.forEach((c, f) => {
      if (starts[c] === undefined) starts[c] = f;
    });
    return { starts, last: view.frames - 1 };
  }, [data.manifest, view.ready, view.frames]);

  const [chosenMode, setMode] = useState('director');
  const [chosenLoop, setLoop] = useState(true);
  // Reduced motion: no moving camera and no autoplay or loop, whatever is set.
  const mode = reducedMotion ? 'manual' : chosenMode;
  const loop = chosenLoop && !reducedMotion;
  const [spotlight, setSpotlight] = useState(true);

  const index = useMemo(() => buildMuscleIndex(muscles), [muscles]);
  const [query, setQuery] = useState('');
  const { regions, matches } = useMemo(
    () => filterMuscles(index, query),
    [index, query]
  );
  const selection = useMuscleSelection({ index, hash, setHash });
  const selectedI = selection.muscle?.i ?? null;

  const weights = useMemo(
    () =>
      muscles && view.ready
        ? activationAt(muscles, view.s, view.direction)
        : null,
    [muscles, view.ready, view.s, view.direction]
  );
  const top = useMemo(
    () => (view.heatmap ? topMuscles(muscles, weights, 3) : []),
    [view.heatmap, muscles, weights]
  );
  const emphasis = useMemo(() => {
    if (selectedI !== null) return [selectedI];
    if (spotlight && view.heatmap && top.length) return top;
    return null;
  }, [selectedI, spotlight, view.heatmap, top]);

  const hostRef = useRef(null);
  const sceneBlocked = !(
    capabilities.webgl &&
    capabilities.decompression &&
    capabilities.worker
  );
  const scene = useAnatomyScene({
    containerRef: hostRef,
    manifest: data.manifest,
    buffer: data.buffer,
    ready: data.stage === 'ready' && capabilities.webgl,
    view,
    themeName: resolved,
    reducedMotion,
    coarsePointer,
    loadScene,
    emphasis,
  });
  const sceneReady = scene.status === 'ready';

  // Heatmap on from the start: the strain story is the point of the lab.
  const { setHeatmap, play, pause } = view;
  useEffect(() => setHeatmap(true), [setHeatmap]);

  // Autoplay once the model is drawn, unless motion is reduced.
  const started = useRef(false);
  useEffect(() => {
    if (!sceneReady || started.current || reducedMotion) return;
    started.current = true;
    play();
  }, [sceneReady, reducedMotion, play]);

  // Loop: hold on lockout, then go again.
  useEffect(() => {
    if (!loop || view.playing || !info || view.frame !== info.last) return;
    const id = setTimeout(play, LOOP_HOLD_MS);
    return () => clearTimeout(id);
  }, [loop, view.playing, view.frame, info, play]);

  // A drag or pinch on the model hands the camera to the user.
  const { camera } = scene;
  useEffect(() => {
    if (!sceneReady) return undefined;
    return camera.onUser(() => setMode('manual'));
  }, [sceneReady, camera]);

  // The camera is a function of the playhead, so scrubbing and pausing show
  // exactly what playback shows at that frame.
  useEffect(() => {
    if (!sceneReady) return;
    const v = cameraFor(mode, info, view.frame, view.s);
    if (!v) return;
    const el = hostRef.current;
    const aspect = el?.clientHeight ? el.clientWidth / el.clientHeight : 1;
    const radius = Math.min(6, v.radius * portraitPullback(aspect));
    camera.set({ ...v, radius }, targetHeight(view.s));
  }, [sceneReady, mode, info, view.frame, view.s, camera]);

  // Screen readers hear the top three once per phase, not every frame.
  const topNames = top.map((i) => muscles[i].name).join(', ');
  const [announced, setAnnounced] = useState({ phase: null, text: '' });
  if (view.heatmap && topNames && view.phaseCode !== announced.phase) {
    setAnnounced({
      phase: view.phaseCode,
      text: `${view.phase}: working hardest, ${topNames}`,
    });
  }

  const onUserTime = () => setLoop(false);
  const onPlay = () => {
    setLoop(true);
    play();
  };
  const onPause = () => {
    setLoop(false);
    pause();
  };
  const onMode = (m) => {
    setMode(m);
    if (m === 'manual') camera.reset();
  };
  const onPreset = (name) => {
    setMode('manual');
    camera.preset(name);
  };
  const pick = (i) =>
    selection.select(i === null ? null : slugify(muscles[i].name));

  const raw = selection.muscle
    ? activationOf(muscles[selection.muscle.i], view.s, view.direction)
    : null;
  const shot = mode === 'director' ? shotFor(view.phaseCode) : null;
  const gutter = wide ? SPACE.lg : SPACE.sm;

  return (
    <div
      data-theme={resolved}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: THEME.bg,
        color: THEME.text,
        fontFamily: FONT.sans,
        colorScheme: resolved,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <SquatHeader
        preference={preference}
        onThemeChange={setPreference}
        compact={!wide}
      />
      <main style={{ flex: 1 }}>
        <div
          style={{
            position: 'relative',
            height: wide ? 'calc(100dvh - 64px)' : 'calc(100dvh - 56px)',
            minHeight: 480,
          }}
        >
          <SquatStage
            capabilities={capabilities}
            data={data}
            scene={scene}
            hostRef={hostRef}
            wide={wide}
            fill
          >
            {view.ready && (
              <div
                style={{
                  position: 'absolute',
                  top: SPACE.xxl,
                  left: gutter,
                  pointerEvents: 'none',
                  maxWidth: wide ? 360 : '60%',
                }}
              >
                <div
                  style={{
                    ...mono,
                    fontSize: wide ? 13 : 11,
                    color: THEME.accent,
                  }}
                >
                  {String(view.phaseCode + 1).padStart(2, '0')} ·{' '}
                  {view.direction}
                </div>
                <div
                  style={{
                    fontSize: wide ? 28 : 20,
                    fontWeight: 700,
                    letterSpacing: -0.5,
                    lineHeight: 1.1,
                    color: THEME.text,
                  }}
                >
                  {view.phase}
                </div>
                {shot && wide && (
                  <div
                    style={{
                      fontSize: 12,
                      color: THEME.textSubtle,
                      marginTop: SPACE.xs,
                    }}
                  >
                    Camera: {shot.why}
                  </div>
                )}
              </div>
            )}
            {view.heatmap && top.length > 0 && sceneReady && (
              <div
                style={{
                  position: 'absolute',
                  top: wide ? SPACE.xxl : 'auto',
                  bottom: wide ? 'auto' : 168,
                  right: gutter,
                  width: wide ? 280 : 210,
                }}
              >
                <StrainPanel
                  muscles={muscles}
                  top={top}
                  weights={weights}
                  selected={selectedI}
                  onPick={pick}
                  compact={!wide}
                />
              </div>
            )}
            {!sceneBlocked && (
              <div
                style={{
                  position: 'absolute',
                  left: gutter,
                  right: gutter,
                  bottom: gutter,
                  maxWidth: 980,
                  margin: '0 auto',
                }}
              >
                <Dock
                  view={view}
                  disabled={!sceneReady}
                  mode={mode}
                  onMode={onMode}
                  onPreset={onPreset}
                  heatmap={view.heatmap}
                  onHeatmap={setHeatmap}
                  spotlight={spotlight}
                  onSpotlight={setSpotlight}
                  onPlay={onPlay}
                  onPause={onPause}
                  onUserTime={onUserTime}
                  wide={wide}
                />
              </div>
            )}
          </SquatStage>
          <p role="status" aria-live="polite" style={srOnly}>
            {announced.text}
          </p>
        </div>

        <section
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: `${SPACE.xl}px ${wide ? SPACE.xl : SPACE.lg}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: SPACE.lg,
          }}
        >
          <p
            style={{
              margin: 0,
              padding: SPACE.md,
              borderRadius: RADIUS.sm,
              border: `1px solid ${THEME.divider}`,
              background: THEME.surface,
              fontSize: 12,
              lineHeight: 1.55,
              color: THEME.textSubtle,
            }}
          >
            Prototype layout. Every value comes from a modelled reference rep,
            not a recording; muscle activation is estimated from joint moments,
            not measured. <a href="/squat">Back to the current page</a>.
          </p>
          {muscles && (
            <div
              style={
                wide
                  ? {
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                      gap: SPACE.xl,
                      alignItems: 'start',
                    }
                  : { display: 'flex', flexDirection: 'column', gap: SPACE.lg }
              }
            >
              <MuscleList
                regions={regions}
                total={index.all.length}
                matches={matches}
                query={query}
                onQuery={setQuery}
                selected={selection.slug}
                onSelect={selection.select}
                notice={selection.notice}
              />
              <MuscleCard
                muscle={selection.muscle}
                band={raw === null ? null : bandOf(raw)}
                peakBand={
                  selection.muscle
                    ? peakBandOf(muscles[selection.muscle.i])
                    : null
                }
                depthPercent={view.pct}
                phase={view.phase}
                direction={view.direction}
                onClear={selection.clear}
              />
            </div>
          )}
        </section>
      </main>
      <AttributionFooter
        onSources={() => setHash({ guide: 'sources' })}
        compact={!wide}
      />
      <GuideDialog
        open={hash.guide !== null}
        pane={hash.guide}
        onPaneChange={(pane) => setHash({ guide: pane })}
        onClose={() => setHash({ guide: null })}
        kv={data.summary?.kv}
        metrics={data.summary?.metrics}
        wide={wide}
      />
    </div>
  );
}
