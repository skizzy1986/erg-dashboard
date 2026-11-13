import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { RADIUS, SPACE } from '../../constants/tokens.js';
import { alpha } from '../../utils/themeCss.js';
import LoadStatus from './LoadStatus.jsx';
import CapabilityNotice from './CapabilityNotice.jsx';
import SceneError from './SceneError.jsx';
import { card } from './ui.js';

// The data's stage while it downloads, then the scene's own. One status
// region throughout, so assistive tech hears one continuous story.
function overlayStage(data, scene) {
  if (data.stage !== 'ready') return data.stage;
  if (scene.status === 'ready') return 'ready';
  if (scene.status === 'building') return 'scene';
  return 'engine';
}

/**
 * The stage: the hero of the page. On desktop a card that fills its grid cell;
 * on a phone a full-bleed area that grows above the docked control bar.
 * `hostRef` is where the scene appends its own canvas; the overlays sit above
 * it in the same box, absolutely placed, so nothing moves when the first frame
 * lands.
 *
 * `strain` is the strain readout (PR B), laid over the model's lower edge:
 * bottom-left on desktop; full width on a phone, stacked over the framing
 * chip. Low: at the top it covered the head and trunk, at the bottom it covers
 * the feet. The caller passes it only while the model can be drawn; when it
 * cannot, the readout goes to the controls instead, clear of the notice.
 */
export default function SquatStage({
  capabilities,
  data,
  scene,
  hostRef,
  wide,
  strain = null,
  children = null,
}) {
  const blocked = !capabilities.webgl || data.stage === 'unsupported';
  const sceneFailed =
    data.stage === 'ready' &&
    (scene.status === 'error' || scene.status === 'contextlost');
  const stage = overlayStage(data, scene);
  const drawn = stage === 'ready' && !sceneFailed;

  const framing = (
    <span
      style={{
        fontFamily: FONT.sans,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.3,
        background: THEME.surface,
        color: THEME.modelled,
        border: `1px solid ${THEME.border}`,
        borderRadius: RADIUS.pill,
        padding: `${SPACE.xxs}px ${SPACE.sm}px`,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      Modelled, not measured
    </span>
  );

  return (
    <section
      aria-label="3D model"
      style={{
        ...(wide ? card : { boxSizing: 'border-box' }),
        position: 'relative',
        // Desktop stretches to the hero row; the phone flexes above the bar,
        // which keeps its own height, so this floor is the canvas's alone.
        ...(wide ? { minHeight: 520 } : { flex: '1 1 auto', minHeight: 240 }),
        minWidth: 0,
        overflow: 'hidden',
        background: `radial-gradient(120% 90% at 50% 0%, ${THEME.surface} 0%, ${THEME.surfaceAlt} 60%, ${alpha(THEME.accent, '12')} 100%)`,
      }}
    >
      {!blocked && (
        <div
          ref={hostRef}
          data-testid="scene-host"
          style={{ position: 'absolute', inset: 0 }}
        />
      )}
      {/* The framing chip, opaque as it sits over the moving model. On a
          phone it moves to the bottom corner, clear of the bar. */}
      {wide && (
        <div
          style={{
            position: 'absolute',
            top: SPACE.lg,
            right: SPACE.lg,
            // Above the status layer, so a message never paints over it.
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          {framing}
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: SPACE.xl,
          // The canvas beneath takes the drag once the model is up.
          pointerEvents: drawn ? 'none' : 'auto',
        }}
      >
        {blocked ? (
          <CapabilityNotice capabilities={capabilities} />
        ) : sceneFailed ? (
          <SceneError kind={scene.errorKind} onRetry={scene.retry} />
        ) : (
          <LoadStatus
            stage={stage}
            loaded={data.loaded}
            total={data.total}
            error={data.error}
            onRetry={data.retry}
            hidden={drawn}
          />
        )}
      </div>
      {wide && strain && (
        <div
          style={{
            position: 'absolute',
            left: SPACE.lg,
            bottom: SPACE.lg,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          {strain}
        </div>
      )}
      {!wide && (
        <div
          style={{
            position: 'absolute',
            left: SPACE.md,
            right: SPACE.md,
            bottom: SPACE.md,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: SPACE.xs,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          {strain && <div style={{ alignSelf: 'stretch' }}>{strain}</div>}
          {framing}
        </div>
      )}
      {children}
    </section>
  );
}
