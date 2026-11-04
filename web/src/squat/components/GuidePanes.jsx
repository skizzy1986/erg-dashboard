import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { RADIUS, SPACE } from '../../constants/tokens.js';
import { alpha } from '../../utils/themeCss.js';
import { PHASES } from '../constants/phases.js';
import {
  MEASURED_PANE,
  METRICS_INTRO,
  PHASE_GUIDE,
  PHASES_INTRO,
} from '../constants/guide.js';
import { METRICS_TABLE } from '../constants/metricsTable.js';
import { METHOD } from '../constants/method.js';
import { REFERENCES } from '../constants/references.js';
import RichText from './RichText.jsx';
import { bodyText, chip, microLabel, mono, srOnly } from './ui.js';

const h3 = {
  margin: `0 0 ${SPACE.sm}px`,
  fontSize: 17,
  fontWeight: 700,
  letterSpacing: -0.2,
  lineHeight: 1.3,
  color: THEME.text,
};
const h4 = { ...microLabel, margin: `0 0 ${SPACE.sm}px` };
const list = {
  margin: 0,
  paddingLeft: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACE.xs + 2,
  fontSize: 14,
  lineHeight: 1.55,
  color: THEME.textSubtle,
};
const stack = { display: 'flex', flexDirection: 'column', gap: SPACE.lg };

function Para({ segments, kv }) {
  return (
    <p style={bodyText}>
      <RichText segments={segments} kv={kv} />
    </p>
  );
}

export function PhasesPane({ kv, wide }) {
  return (
    <div style={stack}>
      <p style={bodyText}>{PHASES_INTRO}</p>
      {PHASES.map((ph) => {
        const g = PHASE_GUIDE[ph.id];
        return (
          <article
            key={ph.id}
            aria-labelledby={`phase-${ph.id}`}
            style={{
              border: `1px solid ${THEME.border}`,
              borderRadius: RADIUS.md,
              padding: wide ? SPACE.xl : SPACE.lg,
              display: 'flex',
              flexDirection: 'column',
              gap: SPACE.md,
            }}
          >
            <h3 id={`phase-${ph.id}`} style={{ ...h3, margin: 0 }}>
              <span
                aria-hidden="true"
                style={{
                  ...mono,
                  fontSize: 12,
                  color: THEME.accent,
                  marginRight: SPACE.sm,
                }}
              >
                {String(ph.index + 1).padStart(2, '0')}
              </span>
              {ph.heading}
            </h3>
            <dl
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: SPACE.sm,
                margin: 0,
              }}
            >
              {g.facts.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    background: THEME.field,
                    border: `1px solid ${THEME.divider}`,
                    borderRadius: RADIUS.sm,
                    padding: `${SPACE.xs + 2}px ${SPACE.sm + 2}px`,
                  }}
                >
                  <dt
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: THEME.muted,
                    }}
                  >
                    {label}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 700,
                      color: THEME.text,
                    }}
                  >
                    {typeof value === 'string' ? (
                      value
                    ) : (
                      <RichText segments={[value]} kv={kv} />
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {g.body.map((segments, i) => (
              <Para key={i} segments={segments} kv={kv} />
            ))}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: wide ? '1fr 1fr' : '1fr',
                gap: SPACE.lg,
              }}
            >
              <div>
                <h4 style={h4}>Look for</h4>
                <ul style={list}>
                  {g.lookFor.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 style={h4}>Faults and cues</h4>
                <ul style={list}>
                  {g.faults.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

const cell = {
  textAlign: 'left',
  verticalAlign: 'top',
  padding: `${SPACE.sm + 2}px ${SPACE.md}px`,
  borderTop: `1px solid ${THEME.divider}`,
  fontSize: 13,
  lineHeight: 1.5,
};

export function MetricsPane({ kv, metrics, wide }) {
  const model = (i) => metrics?.[i] ?? '…';
  return (
    <div style={stack}>
      <p style={bodyText}>{METRICS_INTRO}</p>
      {wide ? (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            color: THEME.textSubtle,
          }}
        >
          <thead>
            <tr>
              {['Metric', 'Model', 'Reference or target'].map((h) => (
                <th
                  key={h}
                  scope="col"
                  style={{
                    ...cell,
                    ...microLabel,
                    borderTop: 'none',
                    paddingBottom: SPACE.sm,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS_TABLE.map((row, i) => (
              <tr key={row.metric}>
                <th scope="row" style={{ ...cell, width: '28%' }}>
                  <span
                    style={{
                      display: 'block',
                      fontWeight: 700,
                      color: THEME.text,
                    }}
                  >
                    {row.metric}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontWeight: 500,
                      fontSize: 12,
                      color: THEME.muted,
                      marginTop: 2,
                    }}
                  >
                    {row.why}
                  </span>
                </th>
                <td
                  style={{
                    ...cell,
                    ...mono,
                    fontWeight: 500,
                    fontSize: 12,
                    color: THEME.text,
                    width: '30%',
                  }}
                >
                  {model(i)}
                </td>
                <td style={cell}>
                  <RichText segments={row.target} kv={kv} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: SPACE.sm,
          }}
        >
          {METRICS_TABLE.map((row, i) => (
            <li
              key={row.metric}
              style={{
                border: `1px solid ${THEME.divider}`,
                borderRadius: RADIUS.sm,
                padding: SPACE.md,
              }}
            >
              <h3 style={{ ...h3, fontSize: 15, margin: 0 }}>{row.metric}</h3>
              <p
                style={{
                  margin: `2px 0 ${SPACE.sm}px`,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: THEME.muted,
                }}
              >
                {row.why}
              </p>
              <dl style={{ margin: 0, display: 'grid', gap: SPACE.xs }}>
                <dt style={microLabel}>Model</dt>
                <dd
                  style={{
                    margin: 0,
                    ...mono,
                    fontWeight: 500,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: THEME.text,
                  }}
                >
                  {model(i)}
                </dd>
                <dt style={{ ...microLabel, marginTop: SPACE.xs }}>
                  Reference or target
                </dt>
                <dd
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: THEME.textSubtle,
                  }}
                >
                  <RichText segments={row.target} kv={kv} />
                </dd>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MeasuredPane() {
  const p = MEASURED_PANE;
  return (
    <div style={stack}>
      <div>
        <h3 style={h3}>{p.heading}</h3>
        <p style={bodyText}>{p.intro}</p>
      </div>
      <div
        style={{
          border: `1px dashed ${THEME.border}`,
          borderRadius: RADIUS.md,
          padding: SPACE.lg,
          background: alpha(THEME.measured, '0d'),
          display: 'flex',
          flexDirection: 'column',
          gap: SPACE.sm,
          alignItems: 'flex-start',
        }}
      >
        <span style={chip(THEME.measured)}>Coming soon</span>
        <p style={{ ...bodyText, color: THEME.text }}>{p.comingSoon}</p>
        <p style={{ ...bodyText, fontSize: 13, color: THEME.muted }}>
          {p.accepts}
        </p>
      </div>
      <div>
        <h4 style={h4}>{p.filesHeading}</h4>
        <ul style={list}>
          {p.files.map((segments, i) => (
            <li key={i}>
              <RichText segments={segments} />
            </li>
          ))}
        </ul>
      </div>
      <p style={{ ...bodyText, fontSize: 13, color: THEME.muted }}>{p.note}</p>
    </div>
  );
}

export function MethodPane({ kv }) {
  return (
    <div style={stack}>
      <section style={stack}>
        <h3 style={{ ...h3, margin: 0 }}>{METHOD.modelledHeading}</h3>
        {METHOD.modelled.map((segments, i) => (
          <Para key={i} segments={segments} kv={kv} />
        ))}
      </section>
      <section>
        <h3 style={h3}>{METHOD.measuredHeading}</h3>
        <ul style={list}>
          {METHOD.measured.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 style={h3}>{METHOD.limitsHeading}</h3>
        <ul style={list}>
          {METHOD.limits.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function SourcesPane() {
  return (
    <ol
      style={{
        margin: 0,
        paddingLeft: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.md,
        fontSize: 14,
        lineHeight: 1.55,
        color: THEME.textSubtle,
      }}
    >
      {REFERENCES.map((ref) => (
        <li key={ref.id} id={`source-${ref.id}`}>
          <RichText segments={ref.citation} />
          {ref.links.map((l) => (
            <span key={l.url}>
              {' '}
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: THEME.accent, fontWeight: 600 }}
              >
                {l.label}
                <span style={srOnly}> (opens in a new tab)</span>
              </a>
            </span>
          ))}
          {ref.usedFor && (
            <span
              style={{
                display: 'block',
                fontFamily: FONT.sans,
                fontSize: 12,
                color: THEME.muted,
                marginTop: 2,
              }}
            >
              Used for: {ref.usedFor}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
