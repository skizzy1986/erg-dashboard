import { useState } from 'react';
import { workoutAccent } from '../utils/formatting.js';
import { THEME } from '../constants/theme.js';

export default function WorkoutItem({
  session,
  rail,
  highlight,
  showRail = true,
}) {
  const [open, setOpen] = useState(false);
  const color = session ? workoutAccent(session.label) : THEME.neutral;
  const hasDetail = session && (session.note || session.fuel || session.meal);
  return (
    <div
      style={{
        background:
          open || highlight
            ? 'color-mix(in srgb, var(--color-accent) 6.27%, transparent)'
            : THEME.raised,
        border: `1px solid ${open || highlight ? color + '50' : THEME.border}`,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <div
        onClick={() => hasDetail && setOpen(!open)}
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'stretch',
          padding: '10px 12px',
          cursor: hasDetail ? 'pointer' : 'default',
        }}
      >
        {rail && (
          <div
            style={{
              width: 42,
              flexShrink: 0,
              textAlign: 'center',
              borderRight: `1px solid ${showRail ? THEME.border : 'transparent'}`,
              paddingRight: 10,
            }}
          >
            {showRail && (
              <>
                <div
                  style={{
                    fontSize: 9,
                    color: highlight ? THEME.accent : THEME.muted,
                    letterSpacing: 1,
                    fontWeight: 700,
                  }}
                >
                  {rail.top}
                </div>
                {rail.big && (
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: highlight ? THEME.accent : THEME.text,
                      lineHeight: 1.1,
                    }}
                  >
                    {rail.big}
                  </div>
                )}
                {rail.bottom && (
                  <div style={{ fontSize: 7, color: THEME.textFaint }}>
                    {rail.bottom}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {highlight && showRail && (
            <div
              style={{
                fontSize: 7,
                color: THEME.accent,
                letterSpacing: 2,
                marginBottom: 3,
              }}
            >
              ● TODAY
            </div>
          )}
          {session ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {session.done ? (
                <span
                  style={{
                    color: THEME.positive,
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  ✓
                </span>
              ) : (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                  }}
                ></span>
              )}
              <span
                style={{
                  fontSize: 11,
                  color: session.done ? '#7a9a8a' : THEME.text,
                  lineHeight: 1.4,
                }}
              >
                {session.slot && (
                  <span style={{ color: THEME.neutralAccent, fontWeight: 700 }}>
                    {session.slot}{' '}
                  </span>
                )}
                {session.label}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: THEME.textFaint }}>—</span>
          )}
        </div>
        {hasDetail && (
          <div
            style={{
              flexShrink: 0,
              alignSelf: 'center',
              fontSize: 10,
              color: THEME.muted,
            }}
          >
            {open ? '▲' : '▼'}
          </div>
        )}
      </div>
      {open && session && (
        <div style={{ padding: `0 12px 12px ${rail ? 64 : 14}px` }}>
          {session.note && (
            <div
              style={{
                background: THEME.bg,
                borderRadius: 5,
                padding: '10px 12px',
                fontSize: 11,
                color: THEME.textSubtle,
                lineHeight: 1.6,
                marginBottom: 6,
              }}
            >
              📋 {session.note}
            </div>
          )}
          {session.fuel && (
            <div
              style={{
                background: THEME.bg,
                borderLeft: `2px solid ${THEME.positive}`,
                borderRadius: 5,
                padding: '10px 12px',
                fontSize: 11,
                color: THEME.textSubtle,
                lineHeight: 1.6,
                marginBottom: session.meal ? 6 : 0,
              }}
            >
              <span style={{ color: THEME.positive, fontWeight: 700 }}>
                🍽 FUEL:{' '}
              </span>
              {session.fuel}
            </div>
          )}
          {session.meal && (
            <div
              style={{
                background: THEME.bg,
                borderLeft: `2px solid ${THEME.caution}`,
                borderRadius: 5,
                padding: '10px 12px',
                fontSize: 11,
                color: THEME.textSubtle,
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  color: THEME.caution,
                  fontWeight: 700,
                  fontSize: 9,
                  letterSpacing: 2,
                  marginBottom: 5,
                }}
              >
                🍴 MEAL SIZE
              </div>
              {session.meal.pre && (
                <div style={{ marginBottom: session.meal.post ? 5 : 0 }}>
                  <span style={{ color: THEME.caution, fontWeight: 700 }}>
                    Pre:{' '}
                  </span>
                  {session.meal.pre}
                </div>
              )}
              {session.meal.post && (
                <div>
                  <span style={{ color: THEME.caution, fontWeight: 700 }}>
                    Post:{' '}
                  </span>
                  {session.meal.post}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
