import { useEffect, useRef } from 'react';
import { THEME } from '../../constants/theme.js';
import { SPACE } from '../../constants/tokens.js';
import { ACT_BASIS, ACT_NONE, ACT_NOTE } from '../constants/activationBands.js';
import { card, chip, microLabel, secondaryButton, srOnly } from './ui.js';

/**
 * The selected muscle: what it is, what it does in a squat, and how hard it is
 * working at the depth and direction already set above it in the DOM.
 *
 * Never a number — a band. The estimate comes from joint moments, and a figure
 * like "63%" reads as a measurement nobody took.
 */
export default function MuscleCard({
  muscle,
  band,
  peakBand,
  depthPercent,
  phase,
  direction,
  onClear,
}) {
  const headingRef = useRef(null);
  const hadMuscle = useRef(false);
  const slug = muscle?.slug ?? null;

  // The card appears beside the list rather than replacing it, so a selection
  // is ANNOUNCED through a live region, not by moving focus. Focus must stay
  // in the listbox: a keyboard user picks a muscle and then keeps arrowing,
  // and focus() scrolls, so a #m= deep link would yank the page on load.
  //
  // The one exception is a clear, where the button that had focus has just
  // unmounted — without this, focus falls to document.body. preventScroll
  // keeps even that from moving the page.
  useEffect(() => {
    if (!slug && hadMuscle.current) {
      headingRef.current?.focus({ preventScroll: true });
    }
    hadMuscle.current = !!slug;
  }, [slug]);

  const announcement = muscle ? `Showing ${muscle.name}` : '';

  // One live region across both states, mounted before anything it has to
  // announce — a role="status" added at the same moment as its text is not
  // reliably read out.
  const live = (
    <span role="status" data-testid="muscle-announce" style={srOnly}>
      {announcement}
    </span>
  );

  if (!muscle) {
    return (
      <div style={{ ...card, padding: SPACE.lg }}>
        {live}
        <h3 ref={headingRef} tabIndex={-1} style={{ ...microLabel, margin: 0 }}>
          Muscle detail
        </h3>
        <p
          style={{
            margin: `${SPACE.sm}px 0 0`,
            fontSize: 13,
            lineHeight: 1.55,
            color: THEME.textSubtle,
          }}
        >
          Pick a muscle from the list to see what it does in a squat and how
          hard it is working at this depth.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        ...card,
        padding: SPACE.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.sm,
      }}
    >
      {live}
      <h3
        ref={headingRef}
        tabIndex={-1}
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1.3,
          color: THEME.text,
        }}
      >
        {muscle.name}
      </h3>
      <p style={{ ...microLabel, margin: 0 }}>{muscle.regionName}</p>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.6,
          color: THEME.textSubtle,
        }}
      >
        {muscle.role}
      </p>
      <div
        data-testid="muscle-band"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: SPACE.sm,
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.4,
          color: THEME.text,
        }}
      >
        {band ? (
          <>
            <span>
              {band.name} at {depthPercent}% depth, {direction} ({phase})
            </span>
            <span style={chip(THEME.modelled)}>{ACT_NOTE}</span>
          </>
        ) : (
          <span>{ACT_NONE}</span>
        )}
      </div>
      {peakBand && (
        <p
          data-testid="muscle-peak"
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.5,
            color: THEME.text,
          }}
        >
          Peaks at {peakBand.name} in the {peakBand.where}.
        </p>
      )}
      <p
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.5,
          color: THEME.textSubtle,
        }}
      >
        {ACT_BASIS}
      </p>
      <div>
        <button
          type="button"
          onClick={onClear}
          style={{ ...secondaryButton, padding: `${SPACE.sm}px ${SPACE.md}px` }}
        >
          Clear selection
        </button>
      </div>
    </div>
  );
}
