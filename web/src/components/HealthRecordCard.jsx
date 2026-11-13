import { Trans } from '@lingui/react/macro';
import { THEME } from '../constants/theme.js';

export function EmptyPanel({ children, role }) {
  return (
    <p
      role={role}
      style={{
        margin: 0,
        padding: '16px 0',
        textAlign: 'center',
        color: THEME.muted,
        fontSize: 13,
      }}
    >
      {children}
    </p>
  );
}

// Exactly one body state, in this order. Paused-and-pending comes first: a
// first mount offline stays pending with fetchStatus 'paused' until the
// network returns, so "Loading…" there would never resolve.
function body({ title, query, isEmpty, emptyText, children }) {
  if (query.isPending && query.isPaused)
    return (
      <EmptyPanel>
        <Trans>Offline: no saved data yet.</Trans>
      </EmptyPanel>
    );
  if (query.isPending)
    return (
      <EmptyPanel>
        <Trans>Loading…</Trans>
      </EmptyPanel>
    );
  if (query.isError && query.data === undefined) {
    const what = title.toLowerCase();
    return (
      <EmptyPanel role="alert">
        <Trans comment="{what} is the card's title in lower case, e.g. blood pressure">
          Couldn&apos;t load {what}.
        </Trans>
      </EmptyPanel>
    );
  }
  if (isEmpty) return <EmptyPanel>{emptyText}</EmptyPanel>;
  return (
    <>
      {children}
      {query.isError && (
        <div style={{ fontSize: 10, color: THEME.muted, marginTop: 8 }}>
          <Trans>Couldn&apos;t refresh, showing earlier data.</Trans>
        </div>
      )}
    </>
  );
}

// Shell + state machine for one health-record card. Props in, no Supabase:
// the view hands it the hook result. `footer` renders in every state (the
// lipid card's sourced decision limits hold with or without results).
export default function HealthRecordCard({
  title,
  accent,
  query,
  isEmpty,
  emptyText,
  footer = null,
  children,
}) {
  return (
    <section
      aria-label={title}
      style={{
        background: THEME.raised,
        border: `1px solid ${THEME.border}`,
        borderRadius: 6,
        padding: '14px 16px',
        marginTop: 12,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: 3,
          color: accent,
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {body({ title, query, isEmpty, emptyText, children })}
      {footer}
    </section>
  );
}
