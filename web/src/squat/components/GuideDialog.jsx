import { useEffect, useRef } from 'react';
import { THEME } from '../../constants/theme.js';
import { FONT } from '../../constants/type.js';
import { LAYER, RADIUS, SPACE } from '../../constants/tokens.js';
import { alpha } from '../../utils/themeCss.js';
import { GUIDE_PANES } from '../constants/guide.js';
import {
  MeasuredPane,
  MethodPane,
  MetricsPane,
  PhasesPane,
  SourcesPane,
} from './GuidePanes.jsx';
import { secondaryButton } from './ui.js';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

const PANE_BODY = {
  phases: PhasesPane,
  metrics: MetricsPane,
  measured: MeasuredPane,
  method: MethodPane,
  sources: SourcesPane,
};

// A managed modal rather than <dialog>: focus moves in on open, Tab is held
// inside, Escape closes, and focus goes back to whatever opened it. The five
// panes follow the WAI-ARIA tabs pattern with automatic activation — arrows
// move and select, Home/End jump to the ends.
export default function GuideDialog({
  open,
  pane,
  onPaneChange,
  onClose,
  kv,
  metrics,
  wide,
}) {
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current
      ?.querySelector('[role="tab"][aria-selected="true"]')
      ?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      if (opener && opener.isConnected && typeof opener.focus === 'function') {
        opener.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [pane]);

  if (!open) return null;

  const ids = GUIDE_PANES.map((p) => p.id);
  const active = ids.includes(pane) ? pane : ids[0];

  const select = (id) => {
    onPaneChange(id);
    dialogRef.current?.querySelector(`#guide-tab-${id}`)?.focus();
  };

  const onTabKey = (e) => {
    const i = ids.indexOf(active);
    const next = {
      ArrowRight: ids[(i + 1) % ids.length],
      ArrowLeft: ids[(i - 1 + ids.length) % ids.length],
      Home: ids[0],
      End: ids[ids.length - 1],
    }[e.key];
    if (next) {
      e.preventDefault();
      select(next);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const nodes = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const inside = dialogRef.current.contains(document.activeElement);
    if (e.shiftKey && (document.activeElement === first || !inside)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
      e.preventDefault();
      first.focus();
    }
  };

  const Body = PANE_BODY[active];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: LAYER.modal,
        display: 'flex',
        alignItems: wide ? 'center' : 'stretch',
        justifyContent: 'center',
        padding: wide ? SPACE.xl : 0,
      }}
    >
      <div
        data-testid="guide-backdrop"
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: alpha(THEME.text, '66'),
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        onKeyDown={onKeyDown}
        style={{
          position: 'relative',
          width: wide ? 'min(960px, 100%)' : '100%',
          maxHeight: wide ? 'calc(100vh - 48px)' : '100%',
          height: wide ? 'auto' : '100%',
          display: 'flex',
          flexDirection: 'column',
          background: THEME.surface,
          color: THEME.text,
          fontFamily: FONT.sans,
          borderRadius: wide ? RADIUS.lg : 0,
          border: wide ? `1px solid ${THEME.border}` : 'none',
          boxShadow: `0 24px 64px ${alpha(THEME.text, '40')}`,
          overflow: 'hidden',
          paddingTop: wide ? 0 : 'env(safe-area-inset-top, 0px)',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACE.md,
            padding: `${SPACE.md}px ${wide ? SPACE.xl : SPACE.lg}px`,
          }}
        >
          <h2
            id="guide-title"
            style={{
              margin: 0,
              flex: 1,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: -0.25,
            }}
          >
            Coaching guide
          </h2>
          <button type="button" onClick={onClose} style={secondaryButton}>
            Close
          </button>
        </header>
        <div
          role="tablist"
          aria-label="Guide sections"
          style={{
            display: 'flex',
            gap: SPACE.xs,
            overflowX: 'auto',
            padding: `0 ${wide ? SPACE.xl : SPACE.lg}px`,
            borderBottom: `1px solid ${THEME.border}`,
            scrollbarWidth: 'none',
            flexShrink: 0,
          }}
        >
          {GUIDE_PANES.map((p) => {
            const on = p.id === active;
            return (
              <button
                key={p.id}
                id={`guide-tab-${p.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`guide-panel-${p.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => select(p.id)}
                onKeyDown={onTabKey}
                style={{
                  fontFamily: FONT.sans,
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  minHeight: 44,
                  padding: `0 ${SPACE.md}px`,
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${on ? THEME.accent : 'transparent'}`,
                  marginBottom: -1,
                  color: on ? THEME.text : THEME.muted,
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div
          ref={bodyRef}
          id={`guide-panel-${active}`}
          role="tabpanel"
          aria-labelledby={`guide-tab-${active}`}
          tabIndex={0}
          style={{
            flex: 1,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            padding: wide ? SPACE.xl : SPACE.lg,
            paddingBottom: `calc(${wide ? SPACE.xl : SPACE.lg}px + env(safe-area-inset-bottom, 0px))`,
          }}
        >
          <Body kv={kv} metrics={metrics} wide={wide} />
        </div>
      </div>
    </div>
  );
}
