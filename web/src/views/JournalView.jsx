import {
  DECISION_LOG,
  HYPOTHESES,
  RULE_FIRING_HISTORY,
  CONFIDENCE_MIGRATION,
} from '../constants/logs.js';
import { THEME } from '../constants/theme.js';

// ── JOURNAL VIEW — the longitudinal spine ─────────────────────
// Decision ledger (the "why"), open hypotheses, rule-firing history,
// and the model-confidence migration from estimate to measured.
// Pure presentation over static journal data — no props, no state.
export default function JournalView() {
  return (
    <>
      <div
        style={{
          background: THEME.raised,
          border: `1px solid ${THEME.accentAlt}30`,
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
        Decisions, open hypotheses, when rules fire, and the model hardening
        from estimate to fact over time.
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
        {DECISION_LOG.slice()
          .reverse()
          .map((d, i) => (
            <div
              key={`${d.date}-${i}`}
              style={{
                background: THEME.raised,
                border: `1px solid ${THEME.border}`,
                borderLeft: `3px solid ${THEME.accent}`,
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
                  }}
                >
                  {d.decision}
                </span>
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
              <div
                style={{
                  fontSize: 10,
                  color: THEME.textSubtle,
                  lineHeight: 1.5,
                }}
              >
                → {d.why}
              </div>
            </div>
          ))}
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
        OPEN HYPOTHESES · THE EXPERIMENTS
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 20,
        }}
      >
        {HYPOTHESES.map((h, i) => {
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
                : '○ OPEN';
          return (
            <div
              key={i}
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
                  {h.h}
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
          Repeated firing of one rule = chronic issue, not a blip. R4 fired
          6/10–6/11 (the fatigue trough), clear since recovery. Watch frequency
          over time.
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
        {CONFIDENCE_MIGRATION.map((m, i) => {
          const mc =
            m.state === 'MEASURED'
              ? THEME.positive
              : m.state === 'FIRMING'
                ? THEME.caution
                : THEME.muted;
          return (
            <div
              key={i}
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
                <span style={{ fontSize: 11, color: THEME.text }}>
                  {m.metric}
                </span>
                <span style={{ fontSize: 8, color: mc, letterSpacing: 1 }}>
                  {m.state}
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
                {m.note}
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
          The model hardens as benchmarks land. Each PENDING → MEASURED is the
          system earning real teeth. Two land soon: TDEE (~Jun 24), CP test
          (~Jun 25).
        </div>
      </div>
    </>
  );
}
