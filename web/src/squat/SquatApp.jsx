import { useEffect, useMemo, useRef, useState } from 'react';
import manifestUrl from './assets/squat-manifest.json?url';
import { THEME } from '../constants/theme.js';
import { DARK, LIGHT } from '../constants/themeValues.js';
import { FONT } from '../constants/type.js';
import { RADIUS, SPACE } from '../constants/tokens.js';
import { PHASES } from './constants/phases.js';
import { useAnatomyData } from './hooks/useAnatomyData.js';
import { useCapabilities } from './hooks/useCapabilities.js';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import { useSquatHashState } from './hooks/useSquatHashState.js';
import { useSquatTheme } from './hooks/useSquatTheme.js';
import { useAnatomyViewState } from './hooks/useAnatomyViewState.js';
import { useAnatomyScene } from './hooks/useAnatomyScene.js';
import { useMuscleSelection } from './hooks/useMuscleSelection.js';
import { buildMuscleIndex, filterMuscles } from './utils/muscleIndex.js';
import { activationOf, bandOf, peakBandOf } from './utils/activation.js';
import { loadSceneModule } from '../anatomy/scene/loadScene.js';
import SquatHeader from './components/SquatHeader.jsx';
import SquatStage from './components/SquatStage.jsx';
import DepthControls, { depthPercent } from './components/DepthControls.jsx';
import CameraControls from './components/CameraControls.jsx';
import ViewOptions from './components/ViewOptions.jsx';
import MuscleList from './components/MuscleList.jsx';
import MuscleCard from './components/MuscleCard.jsx';
import HeatmapLegend from './components/HeatmapLegend.jsx';
import FormCheck from './components/FormCheck.jsx';
import GuideDialog from './components/GuideDialog.jsx';
import AttributionFooter from './components/AttributionFooter.jsx';
import {
  card,
  linkButton,
  microLabel,
  primaryButton,
  secondaryButton,
  touchLink,
} from './components/ui.js';

export const PAGE_TITLE = 'High-bar squat — SplitIQ';
export const PAGE_DESCRIPTION =
  'An interactive coaching model of the high-bar back squat: the five phases, what to look for, common faults and cues, and form targets from published research.';

// The source page's phone breakpoint (max-width: 760px).
const WIDE_QUERY = '(min-width: 761px)';
// Touch-first devices skip the shadow map: the cheapest frame wins there.
const COARSE_QUERY = '(pointer: coarse)';
// The same query hooks/usePrefersReducedMotion.js reads, through the tool's
// own useMediaQuery: importing the dashboard hook here split it into a shared
// chunk on the dashboard's first paint (+0.3 KB of entry, measured).
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function usePageMeta(resolved) {
  useEffect(() => {
    const prevTitle = document.title;
    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (created) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    const prevDesc = meta.getAttribute('content');
    document.title = PAGE_TITLE;
    meta.setAttribute('content', PAGE_DESCRIPTION);
    return () => {
      document.title = prevTitle;
      if (created) meta.remove();
      else meta.setAttribute('content', prevDesc ?? '');
    };
  }, []);

  // data-theme sits on the tool root, but the document behind it (overscroll,
  // the iOS status bar) would stay on the light ground. Values, not THEME: the
  // body is outside the root, so a var() there resolves to :root's light.
  useEffect(() => {
    const ground = (resolved === 'dark' ? DARK : LIGHT).bg;
    const body = document.body.style;
    const prev = body.backgroundColor;
    body.backgroundColor = ground;
    const tc = document.querySelector('meta[name="theme-color"]');
    const prevTc = tc?.getAttribute('content');
    tc?.setAttribute('content', ground);
    return () => {
      body.backgroundColor = prev;
      if (tc && prevTc != null) tc.setAttribute('content', prevTc);
    };
  }, [resolved]);
}

function PhaseStrip({ onOpen, wide }) {
  return (
    <section aria-labelledby="phases-title" style={{ marginTop: SPACE.xl }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: SPACE.md,
          marginBottom: SPACE.md,
        }}
      >
        <h2
          id="phases-title"
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: THEME.text,
          }}
        >
          The rep in five phases
        </h2>
        <button
          type="button"
          onClick={() => onOpen('phases')}
          style={{ ...secondaryButton, padding: '6px 12px' }}
        >
          Cues and faults
        </button>
      </div>
      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: wide
            ? 'repeat(5, minmax(0, 1fr))'
            : 'minmax(0, 1fr)',
          gap: SPACE.sm,
        }}
      >
        {PHASES.map((ph) => (
          <li
            key={ph.id}
            style={{
              ...card,
              padding: SPACE.md,
              display: 'flex',
              flexDirection: wide ? 'column' : 'row',
              gap: wide ? SPACE.xs : SPACE.md,
              alignItems: wide ? 'stretch' : 'baseline',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: FONT.mono,
                fontWeight: 600,
                fontSize: 12,
                color: THEME.accent,
              }}
            >
              {String(ph.index + 1).padStart(2, '0')}
            </span>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: THEME.text,
                }}
              >
                {ph.name}
              </h3>
              <p
                style={{
                  margin: `${SPACE.xs}px 0 0`,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: THEME.textSubtle,
                }}
              >
                {ph.mode}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Full width, between the stage grid and PhaseStrip. Not the right rail: that
 * column is 320-380 px of FormCheck, too narrow for eleven grouped regions,
 * and 118 rows need their own scroll region.
 *
 * Its DOM position is deliberate — the depth and direction the card's band
 * depends on are established by DepthControls above it.
 */
function MuscleSection({
  regions,
  total,
  matches,
  query,
  onQuery,
  selection,
  band,
  peak,
  percent,
  phase,
  direction,
  heatmap,
  wide,
}) {
  return (
    <section aria-labelledby="muscles-title" style={{ marginTop: SPACE.xl }}>
      <h2
        id="muscles-title"
        style={{
          margin: `0 0 ${SPACE.md}px`,
          fontSize: 18,
          fontWeight: 700,
          color: THEME.text,
        }}
      >
        Every muscle in the lift
      </h2>
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
          total={total}
          matches={matches}
          query={query}
          onQuery={onQuery}
          selected={selection.slug}
          onSelect={selection.select}
          notice={selection.notice}
        />
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}
        >
          <MuscleCard
            muscle={selection.muscle}
            band={band}
            peakBand={peak}
            depthPercent={percent}
            phase={phase}
            direction={direction}
            onClear={selection.clear}
          />
          {heatmap && <HeatmapLegend />}
        </div>
      </div>
    </section>
  );
}

// `loadScene` is the seam to the three.js chunk; tests pass a fake scene.
export default function SquatApp({ loadScene = loadSceneModule } = {}) {
  const wide = useMediaQuery(WIDE_QUERY);
  const { preference, resolved, setPreference } = useSquatTheme();
  const capabilities = useCapabilities();
  const [hash, setHash] = useSquatHashState();
  const data = useAnatomyData({ manifestUrl, capabilities });
  usePageMeta(resolved);
  const coarsePointer = useMediaQuery(COARSE_QUERY);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const view = useAnatomyViewState(data.manifest?.meta.S.length ?? null);
  const hostRef = useRef(null);
  // From the capabilities alone, so it is known at the first paint: waiting
  // for data.stage === 'unsupported' would remove the controls after they
  // had been laid out.
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
  });

  const muscles = data.manifest?.meta.muscles;
  const index = useMemo(() => buildMuscleIndex(muscles), [muscles]);
  const [query, setQuery] = useState('');
  const { regions, matches } = useMemo(
    () => filterMuscles(index, query),
    [index, query]
  );
  const selection = useMuscleSelection({ index, hash, setHash });
  const raw = selection.muscle
    ? activationOf(muscles[selection.muscle.i], view.s, view.direction)
    : null;
  const band = raw === null ? null : bandOf(raw);
  const peak = selection.muscle
    ? peakBandOf(muscles[selection.muscle.i])
    : null;

  const openGuide = (pane) => setHash({ guide: pane });
  const closeGuide = () => setHash({ guide: null });
  const gutter = wide ? SPACE.xl : SPACE.lg;
  const summary = data.summary;

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
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          padding: `${wide ? SPACE.xxl : SPACE.xl}px ${gutter}px ${SPACE.xxl}px`,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{ marginBottom: wide ? SPACE.xl : SPACE.lg, maxWidth: 720 }}
        >
          <span style={microLabel}>Coaching model</span>
          <h1
            style={{
              margin: `${SPACE.xs}px 0 ${SPACE.sm}px`,
              fontSize: wide ? 40 : 30,
              fontWeight: 700,
              letterSpacing: wide ? -1 : -0.5,
              lineHeight: 1.1,
              color: THEME.text,
            }}
          >
            High-bar back squat
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: wide ? 16 : 15,
              lineHeight: 1.55,
              color: THEME.textSubtle,
            }}
          >
            Reference rep: 85 kg lifter, 100 kg bar (about 80–85% 1RM),
            touch-and-go.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: SPACE.sm,
              marginTop: SPACE.lg,
            }}
          >
            <button
              type="button"
              onClick={() => openGuide('phases')}
              style={primaryButton}
            >
              Coaching guide
            </button>
            <button
              type="button"
              onClick={() => openGuide('metrics')}
              style={secondaryButton}
            >
              Metrics and targets
            </button>
          </div>
        </div>

        <div
          style={
            wide
              ? {
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 380px)',
                  gap: SPACE.xl,
                  alignItems: 'start',
                }
              : { display: 'flex', flexDirection: 'column', gap: SPACE.lg }
          }
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: SPACE.md,
              minWidth: 0,
            }}
          >
            <SquatStage
              capabilities={capabilities}
              data={data}
              scene={scene}
              hostRef={hostRef}
              wide={wide}
            />
            <DepthControls view={view} />
            {/* Rendered from the first paint, disabled until the model is
                drawn, so nothing below them moves when it is. Where the 3D
                view cannot exist at all they are left out from the start. */}
            {!sceneBlocked && (
              <>
                <CameraControls
                  camera={scene.camera}
                  disabled={scene.status !== 'ready'}
                />
                <ViewOptions
                  layers={view.layers}
                  onLayer={view.setLayer}
                  heatmap={view.heatmap}
                  onHeatmap={view.setHeatmap}
                  disabled={scene.status !== 'ready'}
                />
              </>
            )}
          </div>
          <FormCheck
            summary={summary}
            kv={summary?.kv}
            unavailable={data.stage === 'error' && !summary}
          />
        </div>

        <MuscleSection
          regions={regions}
          total={index.all.length}
          matches={matches}
          query={query}
          onQuery={setQuery}
          selection={selection}
          band={band}
          peak={peak}
          percent={view.ns ? depthPercent(view.sample, view.ns) : 0}
          phase={view.phase}
          direction={view.direction}
          heatmap={view.heatmap && scene.status === 'ready'}
          wide={wide}
        />

        <PhaseStrip onOpen={openGuide} wide={wide} />

        <p
          style={{
            margin: `${SPACE.xl}px 0 0`,
            padding: SPACE.md,
            borderRadius: RADIUS.sm,
            border: `1px solid ${THEME.divider}`,
            // On a surface, not the page ground: accent on bg is 3.2:1 in
            // light, short of AA for this 12 px link (contrastPairs.js).
            background: THEME.surface,
            fontSize: 12,
            lineHeight: 1.55,
            color: THEME.textSubtle,
          }}
        >
          Every value on this page comes from a modelled reference rep, not a
          recording. Muscle activation is estimated from joint moments, not
          measured.{' '}
          <button
            type="button"
            onClick={() => openGuide('method')}
            style={{ ...linkButton, ...touchLink }}
          >
            Method and limits
          </button>
        </p>
      </main>
      <AttributionFooter
        onSources={() => openGuide('sources')}
        compact={!wide}
      />
      <GuideDialog
        open={hash.guide !== null}
        pane={hash.guide}
        onPaneChange={openGuide}
        onClose={closeGuide}
        kv={summary?.kv}
        metrics={summary?.metrics}
        wide={wide}
      />
    </div>
  );
}
