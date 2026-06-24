import { useState } from 'react';

function workoutAccent(txt) {
  if (!txt) return '#3a3a4a';
  const t = txt.toLowerCase();
  if (t.includes('lower')) return '#34d399';
  if (t.includes('upper')) return '#a78bfa';
  if (t.includes('rate ladder') || t.includes('threshold')) return '#ffd700';
  if (t.includes('interval') || t.includes('vo')) return '#ff6b35';
  if (t.includes('yoga') || t.includes('foam') || t.includes('rest'))
    return '#3a3a4a';
  return '#00d4ff'; // erg aerobic default
}

export default function WorkoutItem({
  session,
  rail,
  highlight,
  showRail = true,
}) {
  const [open, setOpen] = useState(false);
  const color = session ? workoutAccent(session.label) : '#3a3a4a';
  const hasDetail = session && (session.note || session.fuel || session.meal);
  return (
    <div
      style={{
        background: open || highlight ? '#00d4ff10' : '#2a2a48',
        border: `1px solid ${open || highlight ? color + '50' : '#4a4a68'}`,
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
              borderRight: `1px solid ${showRail ? '#4a4a68' : 'transparent'}`,
              paddingRight: 10,
            }}
          >
            {showRail && (
              <>
                <div
                  style={{
                    fontSize: 9,
                    color: highlight ? '#00d4ff' : '#7e7e9a',
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
                      color: highlight ? '#00d4ff' : '#e8e8f0',
                      lineHeight: 1.1,
                    }}
                  >
                    {rail.big}
                  </div>
                )}
                {rail.bottom && (
                  <div style={{ fontSize: 7, color: '#6c6c88' }}>
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
                color: '#00d4ff',
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
                    color: '#34d399',
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
                  color: session.done ? '#7a9a8a' : '#e8e8f0',
                  lineHeight: 1.4,
                }}
              >
                {session.slot && (
                  <span style={{ color: '#888', fontWeight: 700 }}>
                    {session.slot}{' '}
                  </span>
                )}
                {session.label}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: '#6c6c88' }}>—</span>
          )}
        </div>
        {hasDetail && (
          <div
            style={{
              flexShrink: 0,
              alignSelf: 'center',
              fontSize: 10,
              color: '#7e7e9a',
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
                background: '#08080d',
                borderRadius: 5,
                padding: '10px 12px',
                fontSize: 11,
                color: '#aaaacc',
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
                background: '#08080d',
                borderLeft: '2px solid #34d399',
                borderRadius: 5,
                padding: '10px 12px',
                fontSize: 11,
                color: '#aaaacc',
                lineHeight: 1.6,
                marginBottom: session.meal ? 6 : 0,
              }}
            >
              <span style={{ color: '#34d399', fontWeight: 700 }}>
                🍽 FUEL:{' '}
              </span>
              {session.fuel}
            </div>
          )}
          {session.meal && (
            <div
              style={{
                background: '#08080d',
                borderLeft: '2px solid #ffd700',
                borderRadius: 5,
                padding: '10px 12px',
                fontSize: 11,
                color: '#aaaacc',
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  color: '#ffd700',
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
                  <span style={{ color: '#ffd700', fontWeight: 700 }}>
                    Pre:{' '}
                  </span>
                  {session.meal.pre}
                </div>
              )}
              {session.meal.post && (
                <div>
                  <span style={{ color: '#ffd700', fontWeight: 700 }}>
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
