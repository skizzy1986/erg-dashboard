import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { RADIUS, SPACE } from '../../constants/tokens.js';
import { alpha } from '../../utils/themeCss.js';
import LoadStatus from './LoadStatus.jsx';
import CapabilityNotice from './CapabilityNotice.jsx';
import SceneError from './SceneError.jsx';
import { card, microLabel } from './ui.js';

// The data's stage while it downloads, then the scene's own. One status
// region throughout, so assistive tech hears one continuous story.
function overlayStage(data, scene) {
  if (data.stage !== 'ready') return data.stage;
  if (scene.status === 'ready') return 'ready';
  if (scene.status === 'building') return 'scene';
  return 'engine';
}

/**
 * The stage card. `hostRef` is where the scene appends its own canvas; the
 * overlays sit above it in the same box, absolutely placed, so nothing moves
 * when the first frame lands.
 */
export default function SquatStage({
  capabilities,
  data,
  scene,
  hostRef,
  wide,
}) {
  const blocked = !capabilities.webgl || data.stage === 'unsupported';
  const sceneFailed =
    data.stage === 'ready' &&
    (scene.status === 'error' || scene.status === 'contextlost');
  const stage = overlayStage(data, scene);
  const drawn = stage === 'ready' && !sceneFailed;

  return (
    <section
      aria-label="3D model"
      style={{
        ...card,
        position: 'relative',
        minHeight: wide ? 520 : 'min(58vh, 460px)',
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
      <span
        style={{
          ...microLabel,
          position: 'absolute',
          top: SPACE.md,
          left: SPACE.lg,
          pointerEvents: 'none',
        }}
      >
        3D model
      </span>
      <span
        style={{
          position: 'absolute',
          top: SPACE.sm,
          right: SPACE.md,
          fontFamily: FONT.sans,
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1.3,
          // Opaque, not a tint: it sits over the moving model, and a
          // see-through chip would put its ink on whatever passes beneath.
          background: THEME.surface,
          color: THEME.modelled,
          border: `1px solid ${THEME.border}`,
          borderRadius: RADIUS.pill,
          padding: `${SPACE.xxs}px ${SPACE.sm}px`,
          pointerEvents: 'none',
        }}
      >
        Modelled, not measured
      </span>
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
    </section>
  );
}
