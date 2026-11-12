import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { RADIUS, SPACE } from '../../constants/tokens.js';
import { PHASES } from '../constants/phases.js';
import { card, microLabel, mono, secondaryButton } from './ui.js';

const PAGE = 5;

export const valueText = (view) =>
  `${view.phase}, ${view.t.toFixed(2)} s, ${view.pct}% depth, modelled`;

export const readoutText = (view) =>
  `${view.t.toFixed(2)} s · ${view.phase} · ${view.pct}% depth · ${view.direction} — modelled`;

export const WAITING_TEXT = 'Rep controls are ready once the model data loads.';

// Disabled controls keep their size and place (no layout shift when they
// come alive) and read as inactive; WCAG 1.4.3 exempts inactive controls.
export const toggle = (on, disabled = false) => ({
  ...secondaryButton,
  minWidth: 44,
  padding: `${SPACE.sm}px ${SPACE.md}px`,
  ...(on
    ? {
        background: THEME.accent,
        color: THEME.surface,
        border: `1px solid ${THEME.accent}`,
      }
    : {}),
  ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
});

/**
 * Time along the reference rep. Works from the manifest alone: no WebGL
 * needed, so the readout is there even where the 3D view is not. Until the
 * manifest arrives it renders the same frame, disabled, so nothing below it
 * moves when it comes alive.
 */
export default function TimeControls({ view }) {
  const { ready, frame, frames, dt } = view;
  const disabled = !ready;
  const last = ready ? frames - 1 : 1;

  // PageUp/PageDown step size, and Home/End, vary across browsers' native
  // range handling, so they are pinned here.
  const onKeyDown = (e) => {
    if (disabled) return;
    const to = {
      PageUp: Math.min(last, frame + PAGE),
      PageDown: Math.max(0, frame - PAGE),
      Home: 0,
      End: last,
    }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    view.setFrame(to);
  };

  return (
    <section
      aria-labelledby="time-title"
      style={{
        ...card,
        padding: SPACE.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.md,
      }}
    >
      <h2 id="time-title" style={{ ...microLabel, margin: 0 }}>
        Rep time
      </h2>
      <input
        type="range"
        aria-label="Rep time"
        min={0}
        max={ready ? (last * dt).toFixed(2) : 1}
        step={ready ? dt : 1}
        value={ready ? view.t.toFixed(2) : 0}
        disabled={disabled}
        aria-describedby={disabled ? 'depth-readout' : undefined}
        aria-valuetext={ready ? valueText(view) : WAITING_TEXT}
        onChange={(e) => view.setTime(Number(e.target.value))}
        onKeyDown={onKeyDown}
        style={{
          width: '100%',
          height: 44,
          margin: 0,
          accentColor: THEME.accent,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      />
      <p
        id="depth-readout"
        data-testid="depth-readout"
        // Silent while playing: fifty updates a second is noise, not news.
        aria-live={view.playing ? 'off' : 'polite'}
        aria-atomic="true"
        style={{
          margin: 0,
          fontFamily: FONT.sans,
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.5,
          // Two lines held from the first paint: the live readout wraps
          // where the waiting sentence does not (390 px), and nothing below
          // may move when the data arrives.
          minHeight: '3em',
          color: THEME.text,
        }}
      >
        {ready ? (
          <>
            <span style={mono}>{view.t.toFixed(2)} s</span> · {view.phase} ·{' '}
            {view.pct}% depth · {view.direction}{' '}
            <span style={{ color: THEME.textSubtle, fontWeight: 500 }}>
              — modelled
            </span>
          </>
        ) : (
          WAITING_TEXT
        )}
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: SPACE.sm,
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => view.step(-1)}
          style={toggle(false, disabled)}
        >
          Step back
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={view.playing ? view.pause : view.play}
          // Wide enough for "Pause", so the row does not reflow as it flips.
          style={{ ...toggle(false, disabled), minWidth: 76 }}
        >
          {view.playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => view.step(1)}
          style={toggle(false, disabled)}
        >
          Step forward
        </button>
      </div>
      <div
        role="group"
        aria-label="Jump to phase"
        style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.xs }}
      >
        {PHASES.map((p) => {
          const on = ready && view.phaseCode === p.index;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => view.jumpToPhase(p.index)}
              style={{
                ...toggle(on, disabled),
                borderRadius: RADIUS.pill,
                fontSize: 12,
              }}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
