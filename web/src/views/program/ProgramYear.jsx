import {
  SEASON,
  SEASON_2,
  EVENT_LADDER,
  VOLUME_PROGRESSION,
} from '../../constants/schedule.js';
import {
  ATHLETE_BACKGROUND,
  RACE_TARGET,
  ORGS,
  EVENT_PATHWAY,
  ANNUAL_ARC,
} from '../../constants/program.js';

export default function ProgramYear() {
  return (
    <>
      {/* Race target banner */}
      <div
        style={{
          background: 'linear-gradient(135deg,#ff2d5520,#1e1e30)',
          border: '1px solid #ff2d5550',
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: '#ff2d55',
            marginBottom: 6,
          }}
        >
          🎯 SEASON TARGET
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            marginBottom: 3,
          }}
        >
          {RACE_TARGET.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#ff8fa8',
            marginBottom: 6,
          }}
        >
          {RACE_TARGET.when} · {RACE_TARGET.formats}
        </div>
        <div style={{ fontSize: 10, color: '#888', lineHeight: 1.5 }}>
          {RACE_TARGET.note}
        </div>
      </div>
      <div
        style={{
          background: '#1e1e30',
          border: '1px solid #4a4a68',
          borderLeft: '3px solid #00d4ff',
          borderRadius: 6,
          padding: '12px 14px',
          marginBottom: 14,
          fontSize: 11,
          color: '#aaaacc',
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: '#00d4ff', fontWeight: 700 }}>ANNUAL ARC: </span>
        Periodised to peak for the Feb 2027 champs across all 3 formats. Base →
        threshold → power → sharpen. Plans firm up at each block boundary;
        detail beyond the current block is directional.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ANNUAL_ARC.map((b, i) => (
          <div
            key={i}
            style={{
              background: b.current ? '#2a2a48' : '#1e1e30',
              border: `1px solid ${b.current ? '#00d4ff40' : '#4a4a68'}`,
              borderLeft: `3px solid ${b.current ? '#00d4ff' : b.test.includes('2k') ? '#ff2d55' : '#5a5a74'}`,
              borderRadius: 6,
              padding: '12px 14px',
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
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: b.current ? '#00d4ff' : '#e8e8f0',
                }}
              >
                {b.current && '▶ '}
                {b.block}
              </span>
              <span style={{ fontSize: 9, color: '#7e7e9a' }}>
                {b.months} · {b.weeks}
              </span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#aaaacc',
                lineHeight: 1.5,
                marginBottom: 5,
              }}
            >
              {b.focus}
            </div>
            <div
              style={{
                fontSize: 9,
                color: b.test.includes('2k') ? '#ff2d55' : '#7e7e9a',
                lineHeight: 1.4,
              }}
            >
              ⏱️ {b.test}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: 9,
          color: '#6c6c88',
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}
      >
        Masters note: the 1:1 roster work-to-recovery ratio suits reduced
        recovery capacity well and prevents the chronic fatigue that derails
        year-long plans. Confirm the 2027 champs date when World Rowing
        announces it, then we lock the taper. Re-evaluate the arc at each block
        boundary.
      </div>

      {/* Season banner */}
      <div
        style={{
          background: 'linear-gradient(135deg,#ff2d5518,#1e1e30)',
          border: '1px solid #ff2d5540',
          borderRadius: 6,
          padding: '14px 16px',
          marginTop: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 6,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#ff2d55',
              letterSpacing: 1,
            }}
          >
            🏆 {SEASON.label}
          </div>
          <div style={{ fontSize: 9, color: '#888' }}>{SEASON.span}</div>
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#aaaacc',
            lineHeight: 1.6,
            marginBottom: 8,
          }}
        >
          {SEASON.goal}
        </div>
        <div
          style={{
            fontSize: 9,
            color: '#888860',
            lineHeight: 1.5,
            marginBottom: 6,
          }}
        >
          {SEASON.arc}
        </div>
        <div
          style={{
            fontSize: 9,
            color: '#666',
            lineHeight: 1.5,
            fontStyle: 'italic',
            borderTop: '1px solid #3e3e5a',
            paddingTop: 7,
          }}
        >
          {SEASON.principle} → {SEASON.next}
        </div>
      </div>

      {/* Event ladder */}
      <div
        style={{
          background: 'linear-gradient(135deg,#ffd70012,#1e1e30)',
          border: '1px solid #ffd70040',
          borderLeft: '3px solid #ffd700',
          borderRadius: 6,
          padding: '14px 16px',
          marginTop: 14,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: '#ffd700',
            marginBottom: 8,
          }}
        >
          SEASON 1 · EVENT LADDER → WORLDS FINALE
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#aaaacc',
            lineHeight: 1.5,
            marginBottom: 10,
          }}
        >
          Each event serves the Feb-27 target. Benchmarks = pure data, no peak.
          Competitions = stepping stones. Only Worlds is a true peak.
        </div>
        {EVENT_LADDER.map((e, i) => {
          const col =
            e.kind === 'TARGET'
              ? '#ff2d55'
              : e.kind === 'competition'
                ? '#ff6b35'
                : e.kind === 'optional'
                  ? '#a78bfa'
                  : '#00d4ff';
          const tag =
            e.kind === 'TARGET'
              ? '🎯 TARGET'
              : e.kind === 'competition'
                ? 'COMP'
                : e.kind === 'optional'
                  ? 'OPTIONAL'
                  : 'TEST';
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 8,
                paddingBottom: 8,
                borderBottom:
                  i < EVENT_LADDER.length - 1 ? '1px solid #3e3e5a' : 'none',
              }}
            >
              <div style={{ width: 88, flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#e8e8f0',
                  }}
                >
                  {e.date}
                </div>
                <div
                  style={{
                    fontSize: 7,
                    color: col,
                    letterSpacing: 1,
                    marginTop: 1,
                  }}
                >
                  {tag} · {e.phase}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: col,
                    marginBottom: 2,
                  }}
                >
                  {e.name}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: '#888',
                    lineHeight: 1.5,
                  }}
                >
                  {e.serves}
                </div>
              </div>
            </div>
          );
        })}
        <div
          style={{
            fontSize: 8,
            color: '#7e7e9a',
            lineHeight: 1.5,
            marginTop: 4,
            fontStyle: 'italic',
          }}
        >
          Benchmarks every ~6-8wk track progress + inform the next phase. Each
          event feeds the next: CP→pacing, 5k→base built, Sep→power, Nov→edge,
          Jan 2k→fitness, tune-ups→race pace, Worlds, March→season close.
          Confirm external event dates when calendars publish.
        </div>
      </div>

      {/* Volume progression — serious-competitor arc */}
      <div
        style={{
          background: 'linear-gradient(135deg,#34d39915,#1e1e30)',
          border: '1px solid #34d39940',
          borderLeft: '3px solid #34d399',
          borderRadius: 6,
          padding: '14px 16px',
          marginTop: 14,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: '#34d399',
            marginBottom: 6,
          }}
        >
          VOLUME PROGRESSION · THE SERIOUS-COMPETITOR ARC
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#e8e8f0',
            fontWeight: 700,
            lineHeight: 1.5,
            marginBottom: 8,
          }}
        >
          {VOLUME_PROGRESSION.ambition}
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#aaaacc',
            lineHeight: 1.5,
            marginBottom: 10,
          }}
        >
          <span style={{ color: '#34d399' }}>Principle: </span>
          {VOLUME_PROGRESSION.principle}
        </div>

        {VOLUME_PROGRESSION.trajectory.map((t, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'baseline',
              marginBottom: 6,
              paddingBottom: 6,
              borderBottom: i < 3 ? '1px solid #3e3e5a' : 'none',
            }}
          >
            <div style={{ width: 96, flexShrink: 0 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#e8e8f0',
                }}
              >
                {t.phase}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#34d399',
                }}
              >
                {t.target}
              </div>
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#888',
                lineHeight: 1.5,
              }}
            >
              {t.note}
            </div>
          </div>
        ))}

        <div
          style={{
            fontSize: 10,
            color: '#ffd700',
            lineHeight: 1.6,
            marginTop: 8,
            background: '#08080d',
            borderRadius: 4,
            padding: '9px 11px',
          }}
        >
          🔑 <span style={{ fontWeight: 700 }}>The unlock: </span>
          {VOLUME_PROGRESSION.unlock}
        </div>
        <div
          style={{
            fontSize: 9,
            color: '#7e7e9a',
            lineHeight: 1.5,
            marginTop: 8,
            fontStyle: 'italic',
          }}
        >
          ⚠️ {VOLUME_PROGRESSION.caveat}
        </div>
        <div
          style={{
            fontSize: 9,
            color: '#6c6c88',
            lineHeight: 1.5,
            marginTop: 6,
          }}
        >
          Now: {VOLUME_PROGRESSION.current}
        </div>
      </div>

      {/* Season 2 sketch */}
      <div
        style={{
          background: 'linear-gradient(135deg,#a78bfa15,#1e1e30)',
          border: '1px solid #a78bfa40',
          borderLeft: '3px solid #a78bfa',
          borderRadius: 6,
          padding: '14px 16px',
          marginTop: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 6,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#a78bfa',
              letterSpacing: 1,
            }}
          >
            🏆 {SEASON_2.label}{' '}
            <span style={{ fontSize: 8, color: '#666' }}>(sketch)</span>
          </div>
          <div style={{ fontSize: 9, color: '#888' }}>{SEASON_2.span}</div>
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#aaaacc',
            lineHeight: 1.6,
            marginBottom: 8,
          }}
        >
          {SEASON_2.theme}
        </div>
        <div
          style={{
            fontSize: 9,
            color: '#ffd700',
            lineHeight: 1.6,
            marginBottom: 10,
            background: '#08080d',
            borderRadius: 4,
            padding: '9px 11px',
          }}
        >
          ⚡ {SEASON_2.fork}
        </div>

        {SEASON_2.phases.map((p, i) => {
          const col =
            p.kind === 'TARGET'
              ? '#ff2d55'
              : p.kind === 'aspirational'
                ? '#a78bfa'
                : p.kind === 'competition'
                  ? '#ff6b35'
                  : p.kind === 'recover'
                    ? '#3a3a4a'
                    : p.kind === 'optional'
                      ? '#34d399'
                      : '#00d4ff';
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 7,
                paddingBottom: 7,
                borderBottom:
                  i < SEASON_2.phases.length - 1 ? '1px solid #3e3e5a' : 'none',
              }}
            >
              <div
                style={{
                  width: 92,
                  flexShrink: 0,
                  fontSize: 9,
                  fontWeight: 700,
                  color: col,
                }}
              >
                {p.phase}
              </div>
              <div
                style={{
                  flex: 1,
                  fontSize: 9,
                  color: '#aaaacc',
                  lineHeight: 1.5,
                }}
              >
                {p.events}
              </div>
            </div>
          );
        })}

        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: '#a78bfa',
            marginTop: 10,
            marginBottom: 8,
          }}
        >
          🌟 ASPIRATIONAL TARGETS · INVESTIGATE + CHASE
        </div>
        {SEASON_2.aspirational.map((a, i) => (
          <div
            key={i}
            style={{
              background: '#08080d',
              borderLeft: '2px solid #a78bfa',
              borderRadius: 4,
              padding: '9px 11px',
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#e8e8f0',
                marginBottom: 2,
              }}
            >
              {a.name}
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#888',
                lineHeight: 1.5,
                marginBottom: 3,
              }}
            >
              {a.what}
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#a78bfa',
                lineHeight: 1.5,
              }}
            >
              → {a.chase}
            </div>
          </div>
        ))}
        <div
          style={{
            fontSize: 8,
            color: '#7e7e9a',
            lineHeight: 1.5,
            marginTop: 6,
            fontStyle: 'italic',
          }}
        >
          Sketch — recurring events reliable, aspirational dates UNCONFIRMED.
          Confirm specifics when 2027-28 calendars publish. The in-person fork
          is the key S2 decision.
        </div>
      </div>

      {/* Athlete background */}
      <div
        style={{
          background: '#2a2a48',
          border: '1px solid #f472b630',
          borderLeft: '3px solid #f472b6',
          borderRadius: 6,
          padding: '14px 16px',
          marginTop: 14,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            color: '#f472b6',
            marginBottom: 6,
          }}
        >
          ATHLETE BACKGROUND · ENGINE HISTORY
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#e8e8f0',
            fontWeight: 700,
            lineHeight: 1.5,
            marginBottom: 10,
          }}
        >
          {ATHLETE_BACKGROUND.headline}
        </div>

        <div
          style={{
            fontSize: 8,
            letterSpacing: 2,
            color: '#00d4ff',
            marginBottom: 5,
          }}
        >
          🚴 CYCLING (TO JAN 2026)
        </div>
        {ATHLETE_BACKGROUND.cycling.map((c, i) => (
          <div
            key={i}
            style={{
              fontSize: 10,
              color: '#aaaacc',
              lineHeight: 1.5,
              marginBottom: 3,
              paddingLeft: 4,
            }}
          >
            · {c}
          </div>
        ))}

        <div
          style={{
            fontSize: 8,
            letterSpacing: 2,
            color: '#34d399',
            margin: '10px 0 5px',
          }}
        >
          🏋 STRENGTH AGE
        </div>
        {ATHLETE_BACKGROUND.strength.map((s, i) => (
          <div
            key={i}
            style={{
              fontSize: 10,
              color: '#aaaacc',
              lineHeight: 1.5,
              marginBottom: 3,
              paddingLeft: 4,
            }}
          >
            · {s}
          </div>
        ))}

        <div
          style={{
            fontSize: 8,
            letterSpacing: 2,
            color: '#ffd700',
            margin: '10px 0 5px',
          }}
        >
          ⚡ WHAT IT MEANS FOR THE MODEL
        </div>
        {ATHLETE_BACKGROUND.implications.map((m, i) => (
          <div
            key={i}
            style={{
              fontSize: 10,
              color: '#aaaacc',
              lineHeight: 1.5,
              marginBottom: 3,
              paddingLeft: 4,
            }}
          >
            · {m}
          </div>
        ))}
      </div>

      {/* Event progression pathway */}
      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: '#00d4ff',
          margin: '20px 0 8px',
        }}
      >
        EVENT PATHWAY · HOME ERG → INTERNATIONAL
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {EVENT_PATHWAY.map((e) => (
          <div
            key={e.step}
            style={{
              background: '#2a2a48',
              border: '1px solid #4a4a68',
              borderRadius: 6,
              padding: '11px 14px',
              display: 'flex',
              gap: 12,
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#4a4a68',
                color: '#00d4ff',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {e.step}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#e8e8f0',
                  }}
                >
                  {e.event}
                </span>
                <span
                  style={{
                    fontSize: 8,
                    color:
                      e.type === 'Virtual'
                        ? '#00d4ff'
                        : e.type === 'International'
                          ? '#ff2d55'
                          : '#34d399',
                    letterSpacing: 1,
                  }}
                >
                  {e.type.toUpperCase()}
                </span>
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: '#7e7e9a',
                  marginBottom: 3,
                }}
              >
                {e.when}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#aaaacc',
                  lineHeight: 1.4,
                }}
              >
                {e.why}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Organisations */}
      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: '#ffd700',
          margin: '20px 0 8px',
        }}
      >
        ORGANISATIONS TO FOLLOW
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ORGS.map((o) => (
          <div
            key={o.name}
            style={{
              background: '#2a2a48',
              border: '1px solid #4a4a68',
              borderLeft: `3px solid ${o.color}`,
              borderRadius: 6,
              padding: '11px 14px',
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
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {o.name}
              </span>
              <span
                style={{
                  fontSize: 8,
                  color: o.color,
                  letterSpacing: 1,
                }}
              >
                {o.tier}
              </span>
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#00d4ff',
                marginBottom: 4,
              }}
            >
              {o.site}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#aaaacc',
                lineHeight: 1.4,
              }}
            >
              {o.note}
            </div>
          </div>
        ))}
      </div>

      {/* Monitoring note */}
      <div
        style={{
          marginTop: 12,
          background: '#1e1e30',
          border: '1px solid #ffd70030',
          borderLeft: '3px solid #ffd700',
          borderRadius: 6,
          padding: '11px 14px',
          fontSize: 10,
          color: '#888860',
          lineHeight: 1.6,
        }}
      >
        📅 Event suggestions: I'll check for current/upcoming events when we
        talk — flag it at Sunday reviews and I'll search for dated targets.
        Known on-water in WA: Australian Masters Rowing Champs were at Champion
        Lakes, Perth (May). Indoor WA state dates publish closer to the winter
        season — we'll catch them as they're announced.
      </div>
    </>
  );
}
