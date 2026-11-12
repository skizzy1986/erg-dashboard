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
import SquatHeader, { HEADER_HEIGHT } from './components/SquatHeader.jsx';
import SquatStage from './components/SquatStage.jsx';
import StageControls from './components/StageControls.jsx';
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
// Plus the notch inset the header pads its top with.
const headerHeight = (wide) =>
  `(${HEADER_HEIGHT[wide ? 'wide' : 'compact']}px + env(safe-area-inset-top, 0px))`;

function usePageMeta(resolved, wide) {
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

  // The header is sticky, so anything scrolled into view (a focused control,
  // a muscle card) must stop below it, not under it (WCAG 2.4.11).
  useEffect(() => {
    const root = document.documentElement.style;
    const prev = root.scrollPaddingTop;
    root.scrollPaddingTop = `calc${headerHeight(wide)}`;
    return () => {
      root.scrollPaddingTop = prev;
    };
  }, [wide]);

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
 * depends on are established by TimeControls above it.
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
  loading,
  failed,
}) {
  const title = (
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
  );

  // The list is built from the manifest, so until that arrives there is
  // nothing to list — and "No muscle matches that. 0 muscles and tendons" is a
  // worse thing to show on every page load than a sentence saying so.
  if (loading || failed) {
    return (
      <section aria-labelledby="muscles-title" style={{ marginTop: SPACE.xl }}>
        {title}
        <div style={{ ...card, padding: SPACE.lg }}>
          <p
            // Announced when it resolves, either way.
            role="status"
            aria-busy={loading ? 'true' : undefined}
            data-testid="muscle-list-placeholder"
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.6,
              color: THEME.text,
            }}
          >
            {failed
              ? 'The muscle list needs the model data, which could not be loaded. Retry above, or reload the page.'
              : 'Loading the muscle list…'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="muscles-title" style={{ marginTop: SPACE.xl }}>
      {title}
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
  usePageMeta(resolved, wide);
  const coarsePointer = useMediaQuery(COARSE_QUERY);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const view = useAnatomyViewState(data.manifest?.meta.rep ?? null, hash.t);
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
  // The rep time rides in the hash once a move settles, so a link reopens on
  // the same frame. Never while playing, and never before the user has moved
  // anything: a plain load leaves the URL alone.
  useEffect(() => {
    if (!view.ready || !view.moved || view.playing) return;
    const id = setTimeout(() => setHash({ t: view.t, paused: true }), 250);
    return () => clearTimeout(id);
  }, [view.ready, view.moved, view.playing, view.t, setHash]);
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
      <main style={{ flex: 1, width: '100%' }}>
        <div
          data-testid="squat-hero"
          style={
            wide
              ? {
                  display: 'grid',
                  gridTemplateColumns:
                    'minmax(0, 1fr) clamp(260px, 26vw, 320px)',
                  gap: SPACE.md,
                  width: '100%',
                  maxWidth: 1600,
                  margin: '0 auto',
                  padding: `${SPACE.lg}px ${SPACE.xl}px`,
                  boxSizing: 'border-box',
                  // A floor, not a fixed height: on a short window the rail
                  // grows the row rather than clipping its last controls.
                  // Border-box, so the floor includes the vertical padding.
                  minHeight: `max(${520 + 2 * SPACE.lg}px, calc(100svh - ${headerHeight(wide)}))`,
                }
              : {
                  display: 'flex',
                  flexDirection: 'column',
                  height: `calc(100svh - ${headerHeight(wide)})`,
                  minHeight: 460,
                  background: THEME.surfaceAlt,
                }
          }
        >
          <SquatStage
            capabilities={capabilities}
            data={data}
            scene={scene}
            hostRef={hostRef}
            wide={wide}
            title={
              <>
                {wide && (
                  <span style={{ ...microLabel, display: 'block' }}>
                    Coaching model
                  </span>
                )}
                <h1
                  style={{
                    margin: 0,
                    fontSize: wide ? 40 : 30,
                    fontWeight: 700,
                    letterSpacing: wide ? -1 : -0.5,
                    lineHeight: 1.1,
                    color: THEME.text,
                  }}
                >
                  High-bar back squat
                </h1>
              </>
            }
          />
          <StageControls
            view={view}
            camera={scene.camera}
            cameraDisabled={scene.status !== 'ready'}
            sceneBlocked={sceneBlocked}
            wide={wide}
            onGuide={openGuide}
          />
        </div>

        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: `${SPACE.xl}px ${gutter}px ${SPACE.xxl}px`,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: SPACE.md,
              marginBottom: SPACE.xl,
            }}
          >
            <p
              style={{
                margin: 0,
                maxWidth: 720,
                fontSize: wide ? 16 : 15,
                lineHeight: 1.55,
                color: THEME.textSubtle,
              }}
            >
              Reference rep: 85 kg lifter, 100 kg bar (about 80–85% 1RM),
              touch-and-go.
            </p>
            {/* On desktop these live in the rail's footer; the phone bar
                keeps to the model's own tools, so they sit here. */}
            {!wide && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.sm }}>
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
            )}
          </div>

          <FormCheck
            summary={summary}
            kv={summary?.kv}
            unavailable={data.stage === 'error' && !summary}
          />

          <MuscleSection
            regions={regions}
            total={index.all.length}
            matches={matches}
            query={query}
            onQuery={setQuery}
            selection={selection}
            band={band}
            peak={peak}
            percent={view.pct}
            phase={view.phase}
            direction={view.direction}
            heatmap={view.heatmap && scene.status === 'ready'}
            wide={wide}
            loading={!data.manifest && data.stage !== 'error'}
            failed={!data.manifest && data.stage === 'error'}
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
        </div>
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
