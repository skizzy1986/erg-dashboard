import { useEffect } from 'react';
import manifestUrl from './assets/squat-manifest.json?url';
import dataUrl from './assets/squat-anatomy.bin?url';
import { THEME } from '../constants/theme.js';
import { DARK, LIGHT } from '../constants/themeValues.js';
import { FONT } from '../constants/type.js';
import { RADIUS, SPACE } from '../constants/tokens.js';
import { alpha } from '../utils/themeCss.js';
import { PHASES } from './constants/phases.js';
import { useAnatomyData } from './hooks/useAnatomyData.js';
import { useCapabilities } from './hooks/useCapabilities.js';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import { useSquatHashState } from './hooks/useSquatHashState.js';
import { useSquatTheme } from './hooks/useSquatTheme.js';
import SquatHeader from './components/SquatHeader.jsx';
import LoadStatus from './components/LoadStatus.jsx';
import CapabilityNotice from './components/CapabilityNotice.jsx';
import FormCheck from './components/FormCheck.jsx';
import GuideDialog from './components/GuideDialog.jsx';
import AttributionFooter from './components/AttributionFooter.jsx';
import {
  card,
  microLabel,
  primaryButton,
  secondaryButton,
} from './components/ui.js';

export const PAGE_TITLE = 'High-bar squat — SplitIQ';
export const PAGE_DESCRIPTION =
  'An interactive coaching model of the high-bar back squat: the five phases, what to look for, common faults and cues, and form targets from published research.';

// The source page's phone breakpoint (max-width: 760px).
const WIDE_QUERY = '(min-width: 761px)';

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

function Stage({ capabilities, data, wide }) {
  const blocked = !capabilities.webgl || data.stage === 'unsupported';
  return (
    <section
      aria-label="3D model"
      style={{
        ...card,
        position: 'relative',
        minHeight: wide ? 520 : 'min(58vh, 460px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACE.xl,
        overflow: 'hidden',
        background: `radial-gradient(120% 90% at 50% 0%, ${THEME.surface} 0%, ${THEME.surfaceAlt} 60%, ${alpha(THEME.accent, '12')} 100%)`,
      }}
    >
      <span
        style={{
          ...microLabel,
          position: 'absolute',
          top: SPACE.md,
          left: SPACE.lg,
        }}
      >
        3D model
      </span>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '8%',
          right: '8%',
          bottom: '14%',
          height: 1,
          background: `linear-gradient(90deg, transparent, ${THEME.border}, transparent)`,
        }}
      />
      {blocked ? (
        <CapabilityNotice capabilities={capabilities} />
      ) : (
        <LoadStatus
          stage={data.stage}
          loaded={data.loaded}
          total={data.total}
          error={data.error}
          onRetry={data.retry}
        />
      )}
    </section>
  );
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
          style={{ ...secondaryButton, minHeight: 36, padding: '6px 12px' }}
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
                  color: THEME.muted,
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

export default function SquatApp() {
  const wide = useMediaQuery(WIDE_QUERY);
  const { preference, resolved, setPreference } = useSquatTheme();
  const capabilities = useCapabilities();
  const [hash, setHash] = useSquatHashState();
  const data = useAnatomyData({ manifestUrl, dataUrl, capabilities });
  usePageMeta(resolved);

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
          <Stage capabilities={capabilities} data={data} wide={wide} />
          <FormCheck
            summary={summary}
            kv={summary?.kv}
            unavailable={data.stage === 'error' && !summary}
          />
        </div>

        <PhaseStrip onOpen={openGuide} wide={wide} />

        <p
          style={{
            margin: `${SPACE.xl}px 0 0`,
            padding: SPACE.md,
            borderRadius: RADIUS.sm,
            border: `1px solid ${THEME.divider}`,
            fontSize: 12,
            lineHeight: 1.55,
            color: THEME.muted,
          }}
        >
          Every value on this page comes from a modelled reference rep, not a
          recording. Muscle activation is estimated from joint moments, not
          measured.{' '}
          <button
            type="button"
            onClick={() => openGuide('method')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              font: 'inherit',
              color: THEME.accent,
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
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
