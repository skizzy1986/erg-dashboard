import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Trans, useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import LogEntry from '../components/LogEntry.jsx';
import LoadTooltip from '../components/LoadTooltip.jsx';
import { tsbBand } from '../utils/trainingLoad.js';
import { readinessStatusText } from '../utils/recoveryAnalytics.js';
import { displayChartDate } from '../utils/displayLocale.js';
import { useVitals } from '../hooks/useVitals.js';
import { useAnchors } from '../hooks/useAnchors.js';
import { THEME } from '../constants/theme.js';
import { FONT } from '../constants/type.js';
import { RADIUS } from '../constants/tokens.js';

// Desktop says more than mobile about the same band, so the copy stays here
// while the thresholds come from tsbBand(). Keyed off band.key so the two can
// never drift apart again.
const TSB_COPY = {
  fresh: msg`✅ Fresh — form positive; recent load below fitness`,
  neutral: msg`⚡ Neutral — recent load and fitness balanced`,
  fatigued: msg`⚠️ Fatigued — recent load above fitness`,
  deep: msg`🔴 High fatigue — recent load well above fitness`,
};

export default function OverviewView({
  latest,
  loadUnavailable,
  tsbColor,
  loadData,
  loggedSessions,
  latestErg,
  totalErgDist,
  totalSessions,
  isWide,
}) {
  // `latest` is null when the training-load read fails or returns no sessions;
  // tsbBand(null) is null, so the copy falls back rather than reading a fake 0.
  const { t, i18n } = useLingui();
  const tsbNow = latest?.tsb ?? null;
  const tsbCopy = TSB_COPY[tsbBand(tsbNow)?.key];
  // Vitals were read from the static `recoveryLog` constant here, so the home
  // screen scored readiness off June data. Same hook, same single readiness
  // definition, as RecoveryView and mobile.
  const { readiness } = useVitals();
  // Was a hardcoded 190 threaded down from App.jsx. Load is measured against
  // the live rowing CP and bike FTP anchors, so a fixed 190 both drifted from
  // the real value and misdescribed the calculation.
  const { anchors, cp, ftp, cpAvailable } = useAnchors();
  // Only what the anchors say; no phase is inferred when they are unset.
  const phase = anchors?.current_phase?.value ?? null;
  const block = anchors?.current_block?.value ?? null;
  const ftpW = ftp ?? '—';
  return (
    <>
      {phase && (
        <div style={{ display: 'flex', marginBottom: 8 }}>
          <div
            aria-label={t`Training phase`}
            style={{
              fontSize: 10,
              fontFamily: FONT.mono,
              color: THEME.accent,
              background: THEME.surface,
              border: `1px solid ${THEME.border}`,
              borderRadius: RADIUS.pill,
              padding: '2px 8px',
            }}
          >
            {[phase, block].filter(Boolean).join(' · ').toUpperCase()}
          </div>
        </div>
      )}
      <section
        aria-label={t`Readiness`}
        style={{
          background: `linear-gradient(135deg,${THEME.surfaceAlt},${THEME.raised})`,
          border: `1px solid ${THEME.border}`,
          borderRadius: 8,
          padding: '14px 16px',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: THEME.muted,
            letterSpacing: 2,
            fontWeight: 700,
          }}
        >
          <Trans comment="Card heading, all capitals">READINESS</Trans>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: THEME.text }}>
          {readiness?.score ?? '—'}
        </div>
        {readiness?.score != null && (
          <div style={{ fontSize: 10, color: THEME.textSubtle }}>
            {readinessStatusText(i18n, readiness.status)}
          </div>
        )}
      </section>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${isWide ? 3 : 2},1fr)`,
          gap: 8,
          marginBottom: 16,
        }}
      >
        {[
          [
            'sessions',
            t({
              message: 'SESSIONS LOGGED',
              comment: 'Stat tile, all capitals',
            }),
            totalSessions,
            t`erg + strength`,
          ],
          [
            'distance',
            t({ message: 'ERG DISTANCE', comment: 'Stat tile, all capitals' }),
            `${(totalErgDist / 1000).toFixed(0)}km`,
            t`logged total`,
          ],
          [
            'watts',
            t({ message: 'LATEST WATTS', comment: 'Stat tile, all capitals' }),
            latestErg?.avg_watts ? `${latestErg.avg_watts}W` : '—',
            t`working avg power`,
          ],
        ].map(([id, k, v, sub]) => (
          <div
            key={id}
            style={{
              background: THEME.raised,
              border: `1px solid ${THEME.border}`,
              borderRadius: 6,
              padding: '11px 13px',
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: THEME.muted,
                letterSpacing: 3,
                marginBottom: 4,
              }}
            >
              {k}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: THEME.textStrong,
                letterSpacing: -0.5,
              }}
            >
              {v}
            </div>
            <div style={{ fontSize: 9, color: THEME.textFaint, marginTop: 2 }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Training Load Chart */}
      <div
        style={{
          background: THEME.raised,
          border: `1px solid ${THEME.border}`,
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 4,
          }}
        >
          <div style={{ fontSize: 9, letterSpacing: 3, color: THEME.warning }}>
            <Trans comment="Card heading, all capitals">TRAINING LOAD</Trans>
          </div>
          <div style={{ fontSize: 9, color: THEME.textFaint }}>
            {cpAvailable
              ? t`Rowing CP ${cp}W · bike FTP ${ftpW}W`
              : t`CP unavailable`}
          </div>
        </div>
        {loadUnavailable && (
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: THEME.muted,
              marginTop: 6,
            }}
          >
            <Trans comment="All capitals">TRAINING LOAD UNAVAILABLE</Trans>
          </div>
        )}

        {/* Current values */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 6,
            marginBottom: 12,
            marginTop: 8,
          }}
        >
          {[
            [
              'CTL',
              t({ message: 'Fitness', comment: 'Subtitle of CTL' }),
              latest ? latest.ctl : '—',
              THEME.accent,
            ],
            [
              'ATL',
              t({ message: 'Fatigue', comment: 'Subtitle of ATL' }),
              latest ? latest.atl : '—',
              THEME.warning,
            ],
            [
              'TSB',
              t({ message: 'Form', comment: 'Subtitle of TSB' }),
              latest ? (latest.tsb > 0 ? '+' : '') + latest.tsb : '—',
              tsbColor,
            ],
          ].map(([k, sub, v, c]) => (
            <div
              key={k}
              style={{
                background: THEME.field,
                borderRadius: 4,
                padding: '8px 10px',
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  color: THEME.muted,
                  letterSpacing: 2,
                }}
              >
                {k} <span style={{ color: THEME.textDim }}>{sub}</span>
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: c,
                  marginTop: 2,
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={160}>
          <LineChart
            data={loadData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="date"
              tick={{
                fontSize: 8,
                fill: THEME.muted,
                fontFamily: FONT.mono,
              }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(loadData.length / 5)}
              tickFormatter={(d) => displayChartDate(i18n.locale, d)}
            />
            <YAxis
              tick={{
                fontSize: 8,
                fill: THEME.muted,
                fontFamily: FONT.mono,
              }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<LoadTooltip />} />
            <ReferenceLine y={0} stroke={THEME.border} strokeDasharray="2 2" />
            <Line
              type="monotone"
              dataKey="ctl"
              stroke={THEME.accent}
              strokeWidth={2}
              dot={false}
              name="CTL"
            />
            <Line
              type="monotone"
              dataKey="atl"
              stroke={THEME.warning}
              strokeWidth={2}
              dot={false}
              name="ATL"
            />
            <Line
              type="monotone"
              dataKey="tsb"
              stroke={tsbColor}
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              name="TSB"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* TSB status */}
        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            color: THEME.muted,
            lineHeight: 1.5,
          }}
        >
          {tsbCopy
            ? i18n._(tsbCopy)
            : t`No training-load reading — form status unknown.`}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 9,
            color: THEME.textDim,
            lineHeight: 1.5,
          }}
        >
          <Trans>
            CTL builds over 42 days — values will be underestimated until ~6
            weeks of data.
          </Trans>{' '}
          {cpAvailable
            ? t`Power-derived load is measured against rowing CP ${cp}W and bike FTP ${ftpW}W; revalidate with a test to sharpen it.`
            : t`Power-derived load is unavailable while the CP anchor cannot be read.`}
        </div>
      </div>

      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: THEME.muted,
          marginBottom: 8,
        }}
      >
        <Trans comment="Section heading, all capitals">RECENT SESSIONS</Trans>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 16,
        }}
      >
        {loggedSessions.slice(0, 4).map((entry, i) => (
          <LogEntry key={`${entry.date}-${entry.label}-${i}`} entry={entry} />
        ))}
      </div>
    </>
  );
}
