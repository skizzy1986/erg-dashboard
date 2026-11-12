import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { RADIUS, SPACE } from '../../constants/tokens.js';
import { PHASES } from '../constants/phases.js';
import { microLabel, mono, secondaryButton } from './ui.js';

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

const ICONS = {
  play: 'M8 5.5v13a.5.5 0 0 0 .77.42l10-6.5a.5.5 0 0 0 0-.84l-10-6.5A.5.5 0 0 0 8 5.5z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  back: 'M6 6h2v12H6zM18 6.5v11a.5.5 0 0 1-.78.42l-8-5.5a.5.5 0 0 1 0-.84l8-5.5A.5.5 0 0 1 18 6.5z',
  forward:
    'M16 6h2v12h-2zM6 6.5v11a.5.5 0 0 0 .78.42l8-5.5a.5.5 0 0 0 0-.84l-8-5.5A.5.5 0 0 0 6 6.5z',
};

function Icon({ d }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  );
}

const iconButton = (disabled) => ({
  ...toggle(false, disabled),
  width: 44,
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});

// The one filled control on the rail: playback is the first thing to reach for.
// `compact` (the phone bar) drops the word and keeps the name.
export function PlayButton({ view, compact = false }) {
  const disabled = !view.ready;
  const label = view.playing ? 'Pause' : 'Play';
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={compact ? label : undefined}
      onClick={view.playing ? view.pause : view.play}
      style={{
        ...toggle(true, false),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACE.sm,
        flexShrink: 0,
        ...(compact ? { width: 44, padding: 0 } : { flex: 1 }),
        ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
      }}
    >
      <Icon d={view.playing ? ICONS.pause : ICONS.play} />
      {!compact && label}
    </button>
  );
}

export function StepButton({ view, dir }) {
  const disabled = !view.ready;
  return (
    <button
      type="button"
      aria-label={dir < 0 ? 'Step back' : 'Step forward'}
      disabled={disabled}
      onClick={() => view.step(dir)}
      style={iconButton(disabled)}
    >
      <Icon d={dir < 0 ? ICONS.back : ICONS.forward} />
    </button>
  );
}

/**
 * The rep-time slider and its readout. Works from the manifest alone: no
 * WebGL needed, so the readout is there even where the 3D view is not. Until
 * the manifest arrives it renders the same frame, disabled, so nothing around
 * it moves when it comes alive.
 */
export function timeSlider({ view, compact = false }) {
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

  const slider = (
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
        minWidth: 0,
        // Grows along the phone bar's row; in the rail's column a flex basis
        // of 0 would override the height and shrink the target to 16 px.
        flex: compact ? 1 : undefined,
        height: 44,
        margin: 0,
        accentColor: THEME.accent,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    />
  );
  const readout = (
    <p
      id="depth-readout"
      data-testid="depth-readout"
      // Silent while playing: fifty updates a second is noise, not news.
      aria-live={view.playing ? 'off' : 'polite'}
      aria-atomic="true"
      style={{
        margin: 0,
        fontFamily: FONT.sans,
        fontSize: compact ? 12 : 13,
        fontWeight: 600,
        lineHeight: 1.5,
        // Two lines held from the first paint: the live readout wraps where
        // the waiting sentence does not, and nothing around it may move when
        // the data arrives or as the phase name changes during playback.
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
  );
  return { slider, readout };
}

export function PhasePills({ view }) {
  const disabled = !view.ready;
  return (
    <div
      role="group"
      aria-label="Jump to phase"
      // Two rows that always balance: the two long names share the first,
      // the three short ones the second, at any width the rail or bar has.
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
        gap: SPACE.xs,
      }}
    >
      {PHASES.map((p) => {
        const on = view.ready && view.phaseCode === p.index;
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
              paddingLeft: SPACE.xs,
              paddingRight: SPACE.xs,
              gridColumn: p.index < 2 ? 'span 3' : 'span 2',
            }}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}

// The rail's rep group: transport, then the slider and its readout, then the
// phase jumps. The phone bar composes the same parts in its own order.
export default function TimeControls({ view, compact = false }) {
  const { slider, readout } = timeSlider({ view, compact });
  return (
    <section
      aria-labelledby="time-title"
      style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}
    >
      <h3 id="time-title" style={{ ...microLabel, margin: 0 }}>
        Rep time
      </h3>
      <div style={{ display: 'flex', gap: SPACE.xs }}>
        <StepButton view={view} dir={-1} />
        <PlayButton view={view} />
        <StepButton view={view} dir={1} />
      </div>
      {slider}
      {readout}
      <PhasePills view={view} />
    </section>
  );
}
