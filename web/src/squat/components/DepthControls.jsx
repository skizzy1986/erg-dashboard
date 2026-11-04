import { useRef } from 'react';
import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { RADIUS, SPACE } from '../../constants/tokens.js';
import { PHASE_CHIPS } from '../../anatomy/utils/depth.js';
import { card, microLabel, mono, secondaryButton } from './ui.js';

const PAGE = 5;

export const depthPercent = (sample, ns) =>
  Math.round((sample / (ns - 1)) * 100);

export const valueText = (phase, sample, ns) =>
  `${phase}, ${depthPercent(sample, ns)}% depth, modelled`;

export const WAITING_TEXT =
  'Depth controls are ready once the model data loads.';

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

function DirectionGroup({ direction, onDirection, disabled }) {
  const refs = useRef({});
  const options = [
    ['lowering', 'Lowering'],
    ['drive', 'Drive'],
  ];
  // Radio-group keyboard pattern: arrows move selection and focus together.
  const onKeyDown = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key))
      return;
    e.preventDefault();
    const next = direction === 'drive' ? 'lowering' : 'drive';
    onDirection(next);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label="Direction"
      onKeyDown={onKeyDown}
      style={{ display: 'flex', gap: SPACE.xs }}
    >
      {options.map(([id, label]) => (
        <button
          key={id}
          ref={(el) => {
            refs.current[id] = el;
          }}
          type="button"
          role="radio"
          aria-checked={direction === id}
          tabIndex={direction === id ? 0 : -1}
          disabled={disabled}
          onClick={() => onDirection(id)}
          style={toggle(direction === id, disabled)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Depth along the reference rep. Works from the manifest alone: no WebGL
 * needed, so the readout is there even where the 3D view is not. Until the
 * manifest arrives it renders the same frame, disabled, so nothing below it
 * moves when it comes alive.
 */
export default function DepthControls({ view }) {
  const { ns, sample, direction, phase } = view;
  const ready = !!ns;
  const disabled = !ready;
  const last = ready ? ns - 1 : 1;

  // PageUp/PageDown step size, and Home/End, vary across browsers' native
  // range handling, so they are pinned here.
  const onKeyDown = (e) => {
    if (disabled) return;
    const to = {
      PageUp: Math.min(last, sample + PAGE),
      PageDown: Math.max(0, sample - PAGE),
      Home: 0,
      End: last,
    }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    view.setSample(to);
  };

  return (
    <section
      aria-labelledby="depth-title"
      style={{
        ...card,
        padding: SPACE.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.md,
      }}
    >
      <h2 id="depth-title" style={{ ...microLabel, margin: 0 }}>
        Depth
      </h2>
      <input
        type="range"
        aria-label="Depth"
        min={0}
        max={last}
        step={1}
        value={ready ? sample : 0}
        disabled={disabled}
        aria-describedby={disabled ? 'depth-readout' : undefined}
        aria-valuetext={ready ? valueText(phase, sample, ns) : WAITING_TEXT}
        onChange={(e) => view.setSample(Number(e.target.value))}
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
        style={{
          margin: 0,
          fontFamily: FONT.sans,
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.5,
          color: THEME.text,
        }}
      >
        {ready ? (
          <>
            Depth <span style={mono}>{depthPercent(sample, ns)}%</span> ·{' '}
            {phase} · {direction}{' '}
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
          onClick={() => view.step(1)}
          style={toggle(false, disabled)}
        >
          Step forward
        </button>
        <DirectionGroup
          direction={direction}
          onDirection={view.setDirection}
          disabled={disabled}
        />
      </div>
      <div
        role="group"
        aria-label="Jump to phase"
        style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.xs }}
      >
        {PHASE_CHIPS.map((c) => (
          <button
            key={c.name}
            type="button"
            aria-pressed={ready && phase === c.name}
            disabled={disabled}
            onClick={() => view.jumpToPhase(c.name)}
            style={{
              ...toggle(ready && phase === c.name, disabled),
              borderRadius: RADIUS.pill,
              fontSize: 12,
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
    </section>
  );
}
