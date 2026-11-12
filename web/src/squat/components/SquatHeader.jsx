import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { LAYER, RADIUS, SPACE } from '../../constants/tokens.js';
import { alpha } from '../../utils/themeCss.js';

const OPTIONS = [
  { id: 'system', label: 'Auto', title: 'Follow the device setting' },
  { id: 'light', label: 'Light', title: 'Light theme' },
  { id: 'dark', label: 'Dark', title: 'Dark theme' },
];

// 20 px glyphs on a 24 grid, drawn in currentColor so they take the ink.
const ICON_PATHS = {
  system: (
    <>
      <circle cx="12" cy="12" r="8" fill="none" strokeWidth="2" />
      <path d="M12 4a8 8 0 0 1 0 16z" stroke="none" fill="currentColor" />
    </>
  ),
  light: (
    <>
      <circle cx="12" cy="12" r="4" fill="none" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
  dark: (
    <path
      d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
      fill="none"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
};

function ThemeIcon({ id }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      {ICON_PATHS[id]}
    </svg>
  );
}

// On a phone the three-way segmented control cost ~140 px the wordmark and the
// "Open SplitIQ" link needed, so it collapses to one 44 px button that steps
// Auto → Light → Dark and names both the current and the next state.
function ThemeCycleButton({ preference, onThemeChange }) {
  const i = Math.max(
    0,
    OPTIONS.findIndex((o) => o.id === preference)
  );
  const current = OPTIONS[i];
  const next = OPTIONS[(i + 1) % OPTIONS.length];
  return (
    <button
      type="button"
      onClick={() => onThemeChange(next.id)}
      aria-label={`Theme: ${current.label}. Switch to ${next.label}`}
      title={`Theme: ${current.label}`}
      style={{
        width: 44,
        height: 44,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        border: `1px solid ${THEME.border}`,
        borderRadius: RADIUS.sm,
        background: THEME.field,
        color: THEME.text,
        cursor: 'pointer',
      }}
    >
      <ThemeIcon id={current.id} />
    </button>
  );
}

function ThemeSegmented({ preference, onThemeChange }) {
  return (
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
              minHeight: 44,
              minWidth: 52,
              padding: `0 ${SPACE.sm}px`,
              border: 'none',
              borderRadius: RADIUS.sm,
              cursor: 'pointer',
              background: on ? THEME.surface : 'transparent',
              color: on ? THEME.text : THEME.textSubtle,
              boxShadow: on ? `0 1px 2px ${alpha(THEME.text, '26')}` : 'none',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// The header's rendered height, which /squat's hero fills the viewport below
// and the document's scroll-padding clears. The 56 px row holds on a phone; on
// desktop the segmented control (44 px buttons + 2 × 2 px padding + 2 × 1 px
// border = 50) plus the row's 2 × 4 px padding stretches it to 58. Each adds
// the 1 px bottom rule. Change the row or the controls and change this.
export const HEADER_HEIGHT = { wide: 59, compact: 57 };

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
          gap: compact ? SPACE.sm : SPACE.md,
          padding: `${SPACE.xs}px ${compact ? SPACE.lg : SPACE.xl}px`,
          minHeight: 56,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: compact ? SPACE.xs : SPACE.sm,
            minWidth: 0,
            flex: 1,
            whiteSpace: 'nowrap',
          }}
        >
          <Wordmark size={compact ? 13 : 15} />
          <span aria-hidden="true" style={{ color: THEME.border }}>
            /
          </span>
          <span
            style={{
              fontFamily: FONT.sans,
              fontSize: 14,
              fontWeight: 600,
              color: THEME.text,
            }}
          >
            Squat
          </span>
        </div>
        {compact ? (
          <ThemeCycleButton
            preference={preference}
            onThemeChange={onThemeChange}
          />
        ) : (
          <ThemeSegmented
            preference={preference}
            onThemeChange={onThemeChange}
          />
        )}
        <a
          href="/"
          style={{
            fontFamily: FONT.sans,
            fontSize: 13,
            fontWeight: 700,
            color: THEME.accent,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            minHeight: 44,
            minWidth: 44,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Open SplitIQ
          <span aria-hidden="true">&nbsp;→</span>
        </a>
      </div>
    </header>
  );
}
