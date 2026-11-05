import { RULE_FIRING_HISTORY } from '../constants/logs.js';
import { THEME } from '../constants/theme.js';
import { alpha } from '../utils/themeCss.js';
import { useCoachLog } from '../hooks/useCoachLog.js';
import { useAnchors } from '../hooks/useAnchors.js';
import { formatAnchor } from '../utils/anchorValues.js';

// The calibration keys the confidence panel reports, with their labels.
const CONFIDENCE_KEYS = [
  ['rowing_cp', 'Critical Power (rowing)'],
  ['bike_ftp', 'FTP (bike)'],
  ['hr_max_working', 'Working max HR'],
  ['drag_factor', 'Drag factor'],
  ['tdee_kcal', 'TDEE'],
];

const STATUS_COLOR = {
  confirmed: THEME.positive,
  provisional: THEME.caution,
  unvalidated: THEME.muted,
};

const emptyStyle = {
  background: THEME.raised,
  border: `1px solid ${THEME.border}`,
  borderRadius: 6,
  padding: '12px 14px',
  fontSize: 10,
  color: THEME.muted,
  lineHeight: 1.5,
};

// ── JOURNAL VIEW — the longitudinal spine ─────────────────────
// Decision ledger (the "why") and hypotheses come from coach_log; the
// model-confidence panel from the live anchors and their statuses.
export default function JournalView() {
  const log = useCoachLog();
  const { anchors, isLoading: anchorsLoading } = useAnchors();
  const decisions = log.decisions;
  const hypotheses = log.hypotheses;
  const logState = log.isLoading
    ? 'Loading journal…'
    : log.isError
      ? "Journal unavailable — couldn't reach the database"
      : null;
  return (
    <>
      <div
        style={{
          background: THEME.raised,
          border: `1px solid ${alpha(THEME.accentAlt, '30')}`,
          borderLeft: `3px solid ${THEME.accentAlt}`,
          borderRadius: 6,
          padding: '11px 14px',
          marginBottom: 16,
          fontSize: 11,
          color: THEME.textSubtle,
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: THEME.accentAlt, fontWeight: 700 }}>
          THE LONGITUDINAL SPINE.{' '}
        </span>
        State tells what, the engine tells how we think, this tells WHY.
        Decisions, hypotheses, when rules fire, and the model hardening from
        estimate to fact over time.
      </div>

      {/* Decision Ledger */}
      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: THEME.accent,
          marginBottom: 8,
        }}
      >
        DECISION LEDGER · THE "WHY"
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 20,
        }}
      >
        {logState ? (
          <div style={emptyStyle}>{logState}</div>
        ) : decisions.length === 0 ? (
          <div style={emptyStyle}>
            No decisions recorded yet — Coach writes them to coach_log
          </div>
        ) : (
          decisions.map((d) => (
            <div
              key={d.id}
              data-testid="decision"
              style={{
                background: THEME.raised,
                border: `1px solid ${THEME.border}`,
                borderLeft: `3px solid ${d.superseded ? THEME.muted : THEME.accent}`,
                borderRadius: 6,
                padding: '10px 13px',
                opacity: d.superseded ? 0.55 : 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: THEME.text,
                    lineHeight: 1.4,
                    flex: 1,
                  }}
                >
                  {d.headline}
                </span>
                {d.superseded && (
                  <span
                    style={{
                      fontSize: 8,
                      color: THEME.muted,
                      letterSpacing: 1,
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                  >
                    superseded
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: THEME.muted,
                  marginBottom: 4,
                }}
              >
                {d.date}
              </div>
              {d.detail && (
                <div
                  style={{
                    fontSize: 10,
                    color: THEME.textSubtle,
                    lineHeight: 1.5,
                  }}
                >
                  → {d.detail}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Hypotheses */}
      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: THEME.caution,
          marginBottom: 8,
        }}
      >
        HYPOTHESES · THE EXPERIMENTS
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 20,
        }}
      >
        {logState ? (
          <div style={emptyStyle}>{logState}</div>
        ) : hypotheses.length === 0 ? (
          <div style={emptyStyle}>No hypotheses recorded yet</div>
        ) : null}
        {!logState &&
          hypotheses.map((h) => {
            const sc =
              h.status === 'supported'
                ? THEME.positive
                : h.status === 'refuted'
                  ? THEME.critical
                  : THEME.caution;
            const si =
              h.status === 'supported'
                ? '✓ SUPPORTED'
                : h.status === 'refuted'
                  ? '✗ REFUTED'
                  : h.status === 'firming'
                    ? '◐ FIRMING'
                    : '○ OPEN';
            return (
              <div
                key={h.id}
                style={{
                  background: THEME.raised,
                  border: `1px solid ${THEME.border}`,
                  borderLeft: `3px solid ${sc}`,
                  borderRadius: 6,
                  padding: '10px 13px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 3,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.text,
                      lineHeight: 1.4,
                      flex: 1,
                    }}
                  >
                    {h.statement}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      color: sc,
                      letterSpacing: 1,
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                  >
                    {si}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: THEME.textSubtle,
                    lineHeight: 1.5,
                  }}
                >
                  {h.evidence}
                </div>
              </div>
            );
          })}
      </div>

      {/* Rule-firing history */}
      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: THEME.warning,
          marginBottom: 8,
        }}
      >
        RULE-FIRING HISTORY · PATTERN DETECTION
      </div>
      <div
        style={{
          background: THEME.raised,
          border: `1px solid ${THEME.border}`,
          borderRadius: 6,
          padding: '12px 14px',
          marginBottom: 6,
        }}
      >
        {RULE_FIRING_HISTORY.slice()
          .reverse()
          .map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'baseline',
                marginBottom: 5,
              }}
            >
              <span
                style={{
                  width: 36,
                  flexShrink: 0,
                  fontSize: 10,
                  color: THEME.muted,
                }}
              >
                {f.date}
              </span>
              {f.fired.length ? (
                <span style={{ fontSize: 10, color: THEME.warning }}>
                  {f.fired.join(', ')}
                </span>
              ) : (
                <span style={{ fontSize: 10, color: THEME.positive }}>
                  clear
                </span>
              )}
            </div>
          ))}
        <div
          style={{
            fontSize: 9,
            color: THEME.muted,
            lineHeight: 1.5,
            borderTop: `1px solid ${THEME.divider}`,
            paddingTop: 8,
            marginTop: 4,
          }}
        >
          Repeated firing of one rule = chronic issue, not a blip. Watch
          frequency over time.
        </div>
      </div>
      <div style={{ height: 14 }} />

      {/* Confidence migration */}
      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: THEME.positive,
          marginBottom: 8,
        }}
      >
        MODEL CONFIDENCE · ESTIMATE → MEASURED
      </div>
      <div
        style={{
          background: THEME.raised,
          border: `1px solid ${THEME.border}`,
          borderRadius: 6,
          padding: '12px 14px',
        }}
      >
        {CONFIDENCE_KEYS.map(([key, label]) => {
          const row = anchors[key] ?? null;
          const state = row
            ? (row.status ?? 'status unknown')
            : anchorsLoading
              ? 'loading'
              : 'not set';
          return (
            <div
              key={key}
              style={{
                padding: '7px 0',
                borderBottom: `1px solid ${THEME.divider}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontSize: 11, color: THEME.text }}>{label}</span>
                <span
                  style={{
                    fontSize: 8,
                    color: STATUS_COLOR[row?.status] ?? THEME.muted,
                    letterSpacing: 1,
                  }}
                >
                  {state.toUpperCase()}
                </span>
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: THEME.muted,
                  marginTop: 2,
                  lineHeight: 1.4,
                }}
              >
                {row ? formatAnchor(row) : `anchors.${key} — not recorded`}
              </div>
            </div>
          );
        })}
        <div
          style={{
            fontSize: 9,
            color: THEME.muted,
            lineHeight: 1.5,
            paddingTop: 8,
            fontStyle: 'italic',
          }}
        >
          Read live from the anchors. Each value hardens unvalidated →
          provisional → confirmed as benchmarks land.
        </div>
      </div>
    </>
  );
}
