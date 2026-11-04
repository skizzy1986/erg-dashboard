import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { RADIUS, SPACE } from '../../constants/tokens.js';
import { alpha } from '../../utils/themeCss.js';
import { FORM_CHECK, FORM_CHECK_LABEL } from '../constants/formCheck.js';
import RichText from './RichText.jsx';
import { card, chip, mono } from './ui.js';

// The reference ideal: the modelled rep scored against published targets.
// Static in PR1; playback and a measured comparison arrive later. It must
// never read as the visitor's own result.
export default function FormCheck({ summary, kv, unavailable }) {
  const n = FORM_CHECK.length;
  return (
    <section
      aria-labelledby="form-check-title"
      style={{ ...card, padding: SPACE.lg }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: SPACE.sm,
          marginBottom: SPACE.xs,
        }}
      >
        <h2
          id="form-check-title"
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: -0.2,
            color: THEME.text,
          }}
        >
          Form check
        </h2>
        <span style={chip(THEME.modelled)}>{FORM_CHECK_LABEL}</span>
      </header>
      <p
        style={{
          margin: `0 0 ${SPACE.md}px`,
          fontSize: 12,
          lineHeight: 1.5,
          color: THEME.muted,
        }}
      >
        The modelled reference rep scored against published targets — not a
        measurement of you.{' '}
        {summary && (
          <span style={{ ...mono, color: THEME.positive }}>
            {n} of {n} on target
          </span>
        )}
      </p>
      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {FORM_CHECK.map((item, i) => (
          <li
            key={item.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '24px minmax(0, 1fr)',
              columnGap: SPACE.sm,
              padding: `${SPACE.sm + 2}px 0`,
              borderTop: i ? `1px solid ${THEME.divider}` : 'none',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 20,
                height: 20,
                marginTop: 1,
                borderRadius: RADIUS.pill,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: THEME.positive,
                background: alpha(THEME.positive, '1f'),
              }}
            >
              ✓
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: SPACE.sm,
                  alignItems: 'baseline',
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: THEME.text,
                  }}
                >
                  {item.name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: THEME.positive,
                    whiteSpace: 'nowrap',
                  }}
                >
                  On target
                </span>
              </div>
              <div
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 12,
                  fontWeight: 500,
                  lineHeight: 1.5,
                  color: THEME.text,
                  marginTop: 2,
                }}
              >
                {summary
                  ? summary.checks[i]
                  : unavailable
                    ? 'Model value unavailable'
                    : 'Loading model value…'}
              </div>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: THEME.muted,
                  marginTop: 2,
                }}
              >
                <RichText segments={item.ref} kv={kv} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
