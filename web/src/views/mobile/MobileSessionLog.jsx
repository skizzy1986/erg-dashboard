import React, { useState } from 'react';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { msg } from '@lingui/core/macro';
import { useSessions } from '../../hooks/useSessions.js';
import { THEME } from '../../constants/theme.js';
import { alpha } from '../../utils/themeCss.js';
import { dateLocale } from '../../utils/displayLocale.js';

function typeColor(type) {
  const t = (type ?? '').toLowerCase();
  if (t.includes('erg') || t.includes('row')) return THEME.accent;
  if (t.includes('strength')) return THEME.accentAlt;
  return THEME.muted;
}

function srpeColor(srpe) {
  if (srpe <= 4) return THEME.positive;
  if (srpe <= 6) return THEME.caution;
  return THEME.warning;
}

// Whole words, not the filter code capitalised: a translation is not the code.
const FILTERS = [
  { id: 'all', label: msg({ message: 'All', comment: 'Session filter chip' }) },
  { id: 'erg', label: msg({ message: 'Erg', comment: 'Session filter chip' }) },
  {
    id: 'strength',
    label: msg({ message: 'Strength', comment: 'Session filter chip' }),
  },
];

function formatDate(dateStr, lang) {
  return new Date(dateStr).toLocaleDateString(dateLocale(lang, 'en-GB'), {
    day: 'numeric',
    month: 'short',
  });
}

export default function MobileSessionLog() {
  const { i18n } = useLingui();
  const [activeFilter, setActiveFilter] = useState('all');
  const { data, isLoading, error } = useSessions();

  const filtered = (data ?? []).filter((s) => {
    if (activeFilter === 'erg')
      return (
        s.type?.toLowerCase().includes('erg') ||
        s.type?.toLowerCase().includes('row')
      );
    if (activeFilter === 'strength')
      return s.type?.toLowerCase().includes('strength');
    return true;
  });
  const count = filtered.length;

  const pillBase = {
    border: 'none',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 11,
    letterSpacing: 1,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  return (
    <div
      style={{
        padding: '16px 16px 24px',
        background: THEME.bg,
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 2,
            color: THEME.positive,
          }}
        >
          <Trans comment="Screen heading, all capitals">SESSIONS</Trans>
        </span>
        <span style={{ fontSize: 11, color: THEME.muted }}>
          <Plural
            value={count}
            one={`${count} logged`}
            other={`${count} logged`}
          />
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 8,
          marginBottom: 16,
          marginTop: 12,
        }}
      >
        {FILTERS.map(({ id: f, label }) => {
          const isActive = activeFilter === f;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                ...pillBase,
                background: isActive ? THEME.positive : THEME.raised,
                color: isActive ? THEME.bg : THEME.muted,
                fontWeight: isActive ? 700 : 400,
              }}
            >
              {i18n._(label)}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div
          style={{
            textAlign: 'center',
            color: THEME.muted,
            marginTop: 40,
            fontSize: 12,
          }}
        >
          <Trans>Loading…</Trans>
        </div>
      )}

      {error && (
        <div
          style={{
            textAlign: 'center',
            color: THEME.critical,
            marginTop: 40,
            fontSize: 12,
          }}
        >
          <Trans>Failed to load sessions</Trans>
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: THEME.muted,
            marginTop: 40,
            fontSize: 12,
          }}
        >
          <Trans>No sessions found</Trans>
        </div>
      )}

      {filtered.map((s) => {
        const dot = typeColor(s.type);
        const isStrength = (s.type ?? '').toLowerCase().includes('strength');
        return (
          <div
            key={s.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '12px 0',
              borderBottom:
                '1px solid color-mix(in srgb, var(--color-border) 20%, transparent)',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: dot,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{ fontSize: 13, color: THEME.text, fontWeight: 500 }}
                >
                  {s.label ?? s.type}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: THEME.muted }}>
                  {s.date ? formatDate(s.date, i18n.locale) : ''}
                </span>
                {s.duration && (
                  <span style={{ fontSize: 10, color: THEME.muted }}>
                    {s.duration}min
                  </span>
                )}
                {s.srpe != null && (
                  <span
                    style={{
                      background: alpha(srpeColor(s.srpe), '22'),
                      color: srpeColor(s.srpe),
                      borderRadius: 4,
                      padding: '1px 5px',
                      fontSize: 9,
                      fontWeight: 700,
                      marginLeft: 6,
                    }}
                  >
                    RPE {s.srpe}
                  </span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              {s.avg_watts != null ? (
                <span
                  style={{ fontSize: 12, fontWeight: 700, color: THEME.accent }}
                >
                  {s.avg_watts}w
                </span>
              ) : s.distance_m != null ? (
                <span style={{ fontSize: 12, color: THEME.muted }}>
                  {(s.distance_m / 1000).toFixed(1)}km
                </span>
              ) : isStrength ? (
                <span
                  style={{
                    background:
                      'color-mix(in srgb, var(--color-accent-alt) 13.33%, transparent)',
                    color: THEME.accentAlt,
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 9,
                  }}
                >
                  <Trans comment="Badge, all capitals">STRENGTH</Trans>
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
