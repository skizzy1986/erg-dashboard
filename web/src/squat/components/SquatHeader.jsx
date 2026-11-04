import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { LAYER, RADIUS, SPACE } from '../../constants/tokens.js';
import { alpha } from '../../utils/themeCss.js';

const OPTIONS = [
  { id: 'system', label: 'Auto', title: 'Follow the device setting' },
  { id: 'light', label: 'Light', title: 'Light theme' },
  { id: 'dark', label: 'Dark', title: 'Dark theme' },
];

export function Wordmark({ size = 15 }) {
  // The SPLITIQ treatment the sign-in screen uses: bold caps, tracked, in the
  // positive ink.
  return (
    <span
      style={{
        fontFamily: FONT.sans,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: size / 8,
        color: THEME.positive,
      }}
    >
      SPLITIQ
    </span>
  );
}

export default function SquatHeader({ preference, onThemeChange, compact }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: LAYER.sticky,
        background: alpha(THEME.surface, 'e6'),
        backdropFilter: 'saturate(1.4) blur(10px)',
        WebkitBackdropFilter: 'saturate(1.4) blur(10px)',
        borderBottom: `1px solid ${THEME.border}`,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: SPACE.md,
          padding: `${SPACE.sm}px ${compact ? SPACE.lg : SPACE.xl}px`,
          minHeight: 56,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: SPACE.sm,
            minWidth: 0,
          }}
        >
          <Wordmark />
          <span aria-hidden="true" style={{ color: THEME.border }}>
            /
          </span>
          <span
            style={{
              fontFamily: FONT.sans,
              fontSize: 14,
              fontWeight: 600,
              color: THEME.text,
              whiteSpace: 'nowrap',
            }}
          >
            Squat
          </span>
        </div>
        <span style={{ flex: 1 }} />
        <div
          role="group"
          aria-label="Theme"
          style={{
            display: 'inline-flex',
            padding: 2,
            gap: 2,
            background: THEME.field,
            border: `1px solid ${THEME.border}`,
            borderRadius: RADIUS.sm + 2,
          }}
        >
          {OPTIONS.map((o) => {
            const on = preference === o.id;
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={on}
                title={o.title}
                onClick={() => onThemeChange(o.id)}
                style={{
                  fontFamily: FONT.sans,
                  fontSize: 12,
                  fontWeight: 700,
                  minHeight: 36,
                  minWidth: compact ? 44 : 52,
                  padding: `0 ${SPACE.sm}px`,
                  border: 'none',
                  borderRadius: RADIUS.sm,
                  cursor: 'pointer',
                  background: on ? THEME.surface : 'transparent',
                  color: on ? THEME.text : THEME.muted,
                  boxShadow: on
                    ? `0 1px 2px ${alpha(THEME.text, '26')}`
                    : 'none',
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <a
          href="/"
          style={{
            fontFamily: FONT.sans,
            fontSize: 13,
            fontWeight: 700,
            color: THEME.accent,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            minHeight: 44,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {compact ? 'SplitIQ' : 'Open SplitIQ'}
          <span aria-hidden="true">&nbsp;→</span>
        </a>
      </div>
    </header>
  );
}
