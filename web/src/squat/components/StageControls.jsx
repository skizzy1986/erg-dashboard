import { useState } from 'react';
import { THEME } from '../../constants/theme.js';
import { RADIUS, SPACE } from '../../constants/tokens.js';
import TimeControls, {
  PhasePills,
  PlayButton,
  StepButton,
  timeSlider,
  toggle,
} from './TimeControls.jsx';
import CameraControls from './CameraControls.jsx';
import ViewOptions from './ViewOptions.jsx';
import { card, secondaryButton, srOnly } from './ui.js';

const rule = {
  borderTop: `1px solid ${THEME.divider}`,
  margin: `${SPACE.md}px 0`,
};

export const footerButton = {
  ...secondaryButton,
  fontSize: 12,
  padding: `${SPACE.sm}px ${SPACE.xs}px`,
};

// Two rows of 44 px targets: the tallest a phone group gets, held for all of
// them so the canvas above does not resize as the tabs change.
const PANEL_MIN = 44 * 2 + SPACE.xs;

const panelId = (id) => `stage-group-${id}`;

/**
 * Every tool for the model, docked to the stage: a full-height rail beside it
 * on desktop, a compact bar beneath it on a phone. The only controls
 * container — the groups inside it carry no card of their own.
 */
export default function StageControls({
  view,
  camera,
  cameraDisabled,
  sceneBlocked,
  sceneFailed = false,
  wide,
  onGuide,
  share = null,
  strain = null,
  children = null,
}) {
  const [open, setOpen] = useState('rep');

  // Rendered from the first paint, disabled until the model is drawn, so
  // nothing around them moves when it is. Where the 3D view cannot exist at
  // all the camera is left out from the start; so is it once the model has
  // failed, which frees the rail for the strain readout (at 1280 × 720 the
  // camera group is ~143 px and the readout ~126 px, with 24 px to spare
  // once the camera is gone). The Show group
  // stays: its heatmap switch drives that readout, which needs only the rep
  // data, while its layer switches stay scene-gated.
  const camGroup =
    sceneBlocked || sceneFailed ? null : (
      <>
        {children}
        <CameraControls
          camera={camera}
          disabled={cameraDisabled}
          compact={!wide}
        />
      </>
    );
  const showGroup = (
    <ViewOptions
      layers={view.layers}
      onLayer={view.setLayer}
      heatmap={view.heatmap}
      onHeatmap={view.setHeatmap}
      disabled={cameraDisabled || sceneBlocked || sceneFailed}
      heatmapDisabled={!view.ready}
      unavailable={sceneBlocked || sceneFailed}
      compact={!wide}
    />
  );
  const title = (
    <h2 id="controls-title" style={srOnly}>
      Controls
    </h2>
  );

  if (wide) {
    return (
      <section
        aria-labelledby="controls-title"
        style={{
          ...card,
          // Tighter top and bottom than the sides: at 1280 × 720 every group
          // has to fit beside the stage without the page scrolling.
          padding: `${SPACE.md}px ${SPACE.lg}px`,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {title}
        <TimeControls view={view} />
        {camGroup && (
          <>
            <div style={rule} />
            {camGroup}
          </>
        )}
        <div style={rule} />
        {showGroup}
        {strain}
        {/* Share is a third footer button, not a row of its own: at
            1280 × 720 the rail has 11 px to spare above the footer, and a
            row would push the footer below the fold. Its message and field
            are laid over the rail above the footer (position: relative). */}
        <div
          style={{
            position: 'relative',
            marginTop: 'auto',
            paddingTop: SPACE.md,
            borderTop: `1px solid ${THEME.divider}`,
            display: 'grid',
            gridTemplateColumns: `repeat(${share ? 3 : 2}, minmax(0, 1fr))`,
            gap: SPACE.xs,
          }}
        >
          <button
            type="button"
            onClick={() => onGuide('phases')}
            style={footerButton}
          >
            Coaching guide
          </button>
          <button
            type="button"
            onClick={() => onGuide('metrics')}
            style={footerButton}
          >
            Metrics and targets
          </button>
          {share}
        </div>
      </section>
    );
  }

  const { slider, readout } = timeSlider({ view, compact: true });
  const groups = [
    ['rep', 'Rep', <PhasePills key="rep" view={view} />],
    camGroup && ['view', 'View', camGroup],
    showGroup && ['show', 'Show', showGroup],
    share && ['share', 'Share', share],
  ].filter(Boolean);

  return (
    <section
      aria-labelledby="controls-title"
      style={{
        // Opaque: accent ink does not pass AA on the page ground, and the bar
        // carries accent pills and the readout.
        background: THEME.surface,
        borderTop: `1px solid ${THEME.border}`,
        padding: `${SPACE.sm}px ${SPACE.md}px`,
        paddingBottom: `calc(${SPACE.md}px + env(safe-area-inset-bottom, 0px))`,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.sm,
        flexShrink: 0,
      }}
    >
      {title}
      {strain}
      <section aria-labelledby="time-title">
        <h3 id="time-title" style={srOnly}>
          Rep time
        </h3>
        <div style={{ display: 'flex', gap: SPACE.sm, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: SPACE.xs, flexShrink: 0 }}>
            <StepButton view={view} dir={-1} />
            <PlayButton view={view} compact />
            <StepButton view={view} dir={1} />
          </div>
          {slider}
        </div>
        {readout}
      </section>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))`,
          gap: SPACE.xxs,
          padding: SPACE.xxs,
          background: THEME.field,
          border: `1px solid ${THEME.border}`,
          borderRadius: RADIUS.sm + 2,
        }}
      >
        {groups.map(([id, label]) => {
          const on = open === id;
          return (
            <button
              key={id}
              type="button"
              aria-expanded={on}
              aria-controls={panelId(id)}
              onClick={() => setOpen(on ? null : id)}
              style={{
                ...toggle(false),
                border: 'none',
                background: on ? THEME.surface : 'transparent',
                color: on ? THEME.text : THEME.textSubtle,
                boxShadow: on ? `inset 0 -2px 0 ${THEME.accent}` : 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      {groups.map(([id, , body]) => (
        <div
          key={id}
          id={panelId(id)}
          hidden={open !== id}
          style={{ minHeight: PANEL_MIN }}
        >
          {body}
        </div>
      ))}
    </section>
  );
}
